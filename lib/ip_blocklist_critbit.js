/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module contains all the functionality needed to initialize, load
 * and check an ip blocklist. The ip blocklist file must contain
 * at least one column that has ip addresses or an ip address range
 * in the following formats, 192.168.0.0 or 192.168.0.0/32. The blocklist
 * polls for any file changes and reloads itself if needed.
 *
 */
var Promise = require('bluebird')
var readFile = Promise.promisify(require('fs').readFile)
var writeFile = Promise.promisify(require('fs').writeFile)
var statFile = Promise.promisify(require('fs').stat)
var parse = Promise.promisify(require('csv-parse'))
var path = require('path')
var ip = require('ip')



/**
 * These functions allow for quickly checking if an IPv4 addresses
 * is a member of a fixed set.  There's one that prepares the data
 * for lookups, and one that makes a fast matching function from the
 * prepared data:
 *
 *    var dataBuffer = makeIPv4MatcherData([...list IP strings...])
 *    var check = makeIPv4MatcherFunc(dataBuffer)
 *    if (check("1.2.3.4")) {
 *      console.log("it was in the set!")
 *    }
 *
 * They're split up like this so that you can do the preparation
 * ahead of time, and also to allow the matching function to be
 * as efficient as possible.
 *
 * We represent a set of IPv4 CIDRs as an array of 32-bit integers
 * storing both the values themselvs, and an index through which to
 * search on them.  The idea is to keep all of the data densely packed
 * in memory, so while things will work using an ordinary javascript
 * array, you  might like to use an ArrayBuffer instead.
 *
 * The structure of the data is [metadata][index][values], as
 * follows:
 *
 *  - The first metadata item, data[0], gives the offset of the
 *    end of the index, i.e. the location of the first value in
 *    in the set.
 *
 *  - The second metadata item, data[1], gives the initial bitmask
 *    to use when traversing the index.  This bitmask selects the
 *    the first bit at which the values in the set differ from one
 *    another.
 *
 *  - The index items, data[2] through data[data[0]-1], are nodes
 *    in a radix-tree style index based on djb's "crit-bit tree"
 *    data structure [1].
 *
 *  - The value items, data[data[0]] onwards, are individual IPs or
 *    CIDRs to be matched against.  The item at data[data[0]] is
 *    always a sentinel value of zero, indicating no match.
 *
 * A lookup in this structure takes as input a 32-bit integer
 * representing an IPv4 address.  It traverses the index by
 * looking at the bits of this integer in order, until it finds
 * a reference to one of the IP values in the set (if it finds zero
 * then the input value is not in the set).
 *
 * The index represents a radix tree as a densely-packed array
 * of 32-bit integers.  Each integer is a tree node encoding data
 * according to the following rules:
 *
 *  - If the high bit is 0 then it's a reference
 *    to a value item.  If the high bit is 1 then
 *    it's a reference to an internal tree node.
 *
 *  - For value items:
 *
 *      - the bottom 5 bits give 1 minus the length of the
 *        value's CIDR prefix.  In other words, the number of
 *        low-order bits to ignore when comparing the input value
 *        to the found value (from 0 to 31).
 *
 *      - the remaining 26 bits give the offset of the value,
 *        from the end of the index data.
 *
 *      - the value 0 acts like a null pointer and represents
 *        a failure to find a data item.
 *
 *  - For internal tree nodes:
 *
 *      - the bottom 5 bits give the number of bits to shift
 *        the bitmask by for the next lookup (1 through 31).
 *    
 *      - the remaining 26 bits give the offset of the next
 *        index node to look at, from the start of the data.
 *
 *  - When examining input bit b at an internal node
 *    with offset n, we look at data[n] when input[b]
 *    is zero and data[n+1] when input[b] is one.
 *
 * The set thus has the following limitations:
 *
 *  - It cannot store 0.0.0.0, since that's our null pointer.
 *
 *  - It cannot contain more than 2^26 ~= 67 million items
 *    or index nodes, which is probably fine for most uses.
 *
 * 
 * [1] http://cr.yp.to/critbit.html
 *
 */

const HIGH_BIT =  0b10000000000000000000000000000000;
const PNTR_BITS = 0b01111111111111111111111111100000;
const MASK_BITS = 0b00000000000000000000000000011111;
const MASK_LEN = 5;


function makeIPv4MatcherFunc(data) {

  var startOfItems = data[0] >>> 0;
  var initialMask = data[1] >>> 0;

  return function IPv4Matcher(value) {
    // Start by examining the initial bit,
    // and at the first node of the index.
    var mask = initialMask;
    var iptr = 2 + !!(value & mask);
    var next = data[iptr] >>> 0;

    // Traverse the tree until we reach a reference
    // to a data value, or a null pointer.
    while (next & HIGH_BIT) {
      // Skip ahead that many bits in the input value.
      mask = mask >>> (next & MASK_BITS);
      // Look at the specified index node.
      iptr = (next & PNTR_BITS) >>> MASK_LEN;
      iptr += !!(value & mask);
      next = data[iptr] >>> 0;
    }

    // Compare it to the found value, masking off any bits
    // not covered by the CIDR prefix.  We have to be careful
    // to do an *unsigned* comparison here.
    var dmask = (-1 << (next & MASK_BITS)) >>> 0;
    var dptr = (next & PNTR_BITS) >>> MASK_LEN;
    return next && ((value & dmask) >>> 0) === (data[startOfItems + dptr] >>> 0);
  }

}

function makeIPv4MatcherData(items) {

  // Parse the items into pairs of ints [addr, bitsToIgnore].
  items = items.map(function(ln) {
    return ln.join(',').trim();
  }).filter(function(ln) {
    return ln && ln[0] !== '#';
  }).map(function(ln) {
    var bits = ln.split('/')
    if (bits.length === 1) {
      return [ip.toLong(bits[0]) >>> 0, 0];
    } else if (bits.length === 2) {
      var prefixLen = parseInt(bits[1], 10);
      if (prefixLen <= 0 || prefixLen >= 32) {
        throw new Error('Invalid data: ' + ln);
      }
      var value = ip.mask(bits[0], ip.fromPrefixLen(prefixLen));
      return [ip.toLong(value) >>> 0, 32 - prefixLen];
    } else {
      throw new Error('Invalid data: ' + ln);
    }
  });

  // Sort them by address.  This has the effect of clustering
  // items with shared prefixes so they're adjacent, and putting
  // proper prefixes before proper suffixes.
  items.sort(function(a, b) {
    return (a[0] - b[0])
  })

  // Remove any redundant items, i.e. ones that are proper suffixes
  // of other items already in the list.  Thanks to the sorting bove,
  // suffixes immediately follow prefixes in list.
  for (var i = 0; i < items.length; i++) {
    var j = i + 1;
    var mask = (-1 << items[i][1]) >>> 0;
    while (j < items.length && (items[j][0] & mask) === items[i][0]) {
      items.splice(j, 1);
    }
  }

  // Insert zero as the first item, a sentinel value to
  // ensure termination of searches.
  if (items.length > 0 && items[0][0] === 0 && items[0][1] === 0) {
    throw new Error('The set cannot include 0.0.0.0')
  }

  items.splice(0, 0, [0, 0]);

  if (items.length > (PNTR_BITS >> MASK_LEN)) {
    throw new Error('Too many items to index')
  }

  // We now build a crit-bit tree for locating items in that list.
  // We start at the most significant bit and recursively split the
  // list into two parts, one where that bit is zero and one where
  // that bit is one.  If all items match at a given bit, we skip
  // over it.

  // Recall that the first two data items are used for metadata, so the
  // tree structure starts at index[2].
  var index = [0, 0, 0, 0]

  function splitAndInsert(iptr, lo, hi, bitMask, skipped) {
    // If we're down to a single item, just insert it.
    // Its complement will have been set to zero by the caller.
    if (lo === hi) {
      var bit = !!(items[lo][0] & bitMask);
      index[iptr + bit] = (lo << MASK_LEN) | items[lo][1];
      return skipped;
    }
    // Find the point at which this bit stops being zero, starts being one.
    var split = lo;
    while (split <= hi && !(items[split][0] & bitMask)) {
      split++;
    }
    // Were they all zero, or all one?
    // We can ignore this bit and move to the next.
    if (split === lo || split > hi) {
      return splitAndInsert(iptr, lo, hi, bitMask >>> 1, skipped + 1);
    }
    // If there's a single item with that bit zero, store it directly.
    // Otherwise, create a new node for the subtree.
    if (lo === split - 1) {
      index[iptr] = (lo << MASK_LEN) | items[lo][1];
    } else {
      var iptr2 = index.length;
      index.push(0);
      index.push(0);
      if (index.length > (PNTR_BITS >> MASK_LEN)) {
        throw new Error('Too many index nodes required')
      }
      var shift = splitAndInsert(iptr2, lo, split - 1, bitMask >>> 1, 1);
      index[iptr] = HIGH_BIT | (iptr2 << MASK_LEN) | shift;
    }
    // If there's a single item with that bit one, store it directly.
    // Otherwise, create a new node for the subtree.
    if (split === hi) {
      index[iptr + 1] = (hi << MASK_LEN) | items[hi][1];
    } else {
      var iptr2 = index.length;
      index.push(0);
      index.push(0);
      if (index.length > (PNTR_BITS >> MASK_LEN)) {
        throw new Error('Too many index nodes required')
      }
      var shift = splitAndInsert(iptr2, split, hi, bitMask >>> 1, 1);
      index[iptr + 1] = HIGH_BIT | (iptr2 << MASK_LEN) | shift;
    }
    return skipped;
  }

  var initialShift = splitAndInsert(2, 1, items.length - 1, HIGH_BIT, 0)

  // Record the extra metadata necessary for traversing the index.
  index[0] = index.length;
  index[1] = HIGH_BIT >>> initialShift;

  // Append the data items to the end of the array.
  // We only need to value, the prefix lengths are now encoded
  // as part of the index structure.
  items.forEach(function(item) {
    index.push(item[0]);
  })

  // That's it!  The caller can write this to whereever, and/or
  // pass it to makeIPv4MatcherFunc to make a fast matcher.
  return Uint32Array.from(index);
}

function emptyMatcher() {
  return false;
}


module.exports = function (log, config) {

  function IPBlocklist() {
    this.matcher =  emptyMatcher
    this.pollInterval = null
  }

  IPBlocklist.prototype.load = function (filePath) {
    var self = this

    // Resolve file path to an absolute location
    filePath = path.resolve(filePath)
    self.filePath = filePath
    self.fileName = path.basename(filePath)

    var startTime = Date.now()
    // Try caching the results of preparing the datastructure...
    return statFile(filePath + ".ipv4matcher")
      .then(
        function onFileFound() {
          return readFile(filePath + ".ipv4matcher")
            .then(function(data) {
              // I'm quite sad we need to copy this into a TypedArray :-(
              // Maybe we should re-write the matcher algorithm to work directly
              // with buffers rather than on a Uint32Array...
              var ab = new ArrayBuffer(data.length)
              var u8view = new Uint8Array(ab)
              for (var i = 0; i < data.length; i++) {
                u8view[i] = data[i];
              }
              return new Uint32Array(ab);
            })
        },
        function onFileError() {
          return readFile(filePath, 'utf8')
            .then(function (data) {
              return parse(data)
            })
            .then(function (rows) {
              return makeIPv4MatcherData(rows)
            })
            .then(function (data) {
              return writeFile(filePath + ".ipv4matcher", Buffer.from(data.buffer))
                .then(function() {
                  return data
                })
            })
      }
    )
    .then(function (data) {
      self.matcher = makeIPv4MatcherFunc(data)
      var endTime = Date.now()
      log.info({
        op: 'fxa.customs.blocklist.load',
        fileName: self.fileName,
        fileSize: self.fileSize,
        loadedIn: (endTime - startTime)
      })
    })
  }

  IPBlocklist.prototype.clear = function () {
    this.matcher = emptyMatcher
  }

  IPBlocklist.prototype.contains = function (ipAddress) {
    var startTime = Date.now()
    var endTime

    log.info({
      op: 'fxa.customs.blocklist.check',
      ip: ipAddress,
      fileName: this.fileName,
      fileSize: this.fileSize
    })

    try {
      var ipAsInt = ip.toLong(ipAddress)|0;
      var result = ipAsInt && this.matcher(ipAsInt);
      // If `hit` log metrics on time taken
      if (result) {
        endTime = Date.now()
        log.info({
          p: 'fxa.customs.blocklist.hit',
          ip: ipAddress,
          fileName: this.fileName,
          fileSize: this.fileSize,
          foundIn: (endTime - startTime)
        })
      }
      return result
    } catch (err) {
      // On any error, fail closed and reject request. These errors could be
      // malformed ip address, etc
      log.error({
        op: 'fxa.customs.blocklist.error',
        fileName: this.fileName,
        fileSize: this.fileSize,
        err: err
      })
      throw err
    }
  }

  IPBlocklist.prototype.pollForUpdates = function () {
    this.stopPolling()
    this.pollInterval = setInterval(this.refresh.bind(this), config.ipBlocklist.updatePollInterval * 1000)
  }

  IPBlocklist.prototype.stopPolling = function () {
    clearInterval(this.pollInterval)
  }

  IPBlocklist.prototype.refresh = function () {
    var self = this

    log.trace({
      op: 'fxa.customs.blocklist.refreshList',
      fileName: self.fileName,
      fileSize: self.fileSize
    })

    return statFile(self.filePath)
      .then(function (fileStats) {
        var mtime = fileStats.mtime.getTime()
        if (mtime > self.fileLastModified) {
          return self.load(self.filePath)
        }
      })
      .catch(function (err) {
        log.error(err)
      })
  }

  return IPBlocklist
}

module.exports.makeIPv4MatcherFunc = makeIPv4MatcherFunc
module.exports.makeIPv4MatcherData = makeIPv4MatcherData
