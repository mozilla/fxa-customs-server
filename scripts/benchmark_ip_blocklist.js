//
//  A simple little script to benchmark IPBlocklist implementations.
//  It loads the nominated blocklist file, checks a bunch of ips
//  against it, and tells you the time and memory usage of doing so.
//


const path = require('path')
const ip = require('ip')
const P = require('bluebird')

const NUM_RUNS = 5;
const NUM_IPS = 10000;


if (process.argv.length !== 4) {
  throw new Error("Usage: benchmark_ip_blocklist.js ./path/to/blocklist_module.js ./path/to/blocklist/file.netstat")
}

var log = {
  info: function () {
  },
  error: function () {
  },
  trace: function () {
  }
}

var config = {
  ipBlocklist: {
    updatePollInterval: 0
  }
}

const IPBlocklist = require(path.resolve(process.argv[2]))(log, config)
const blocklistFile = process.argv[3]

// Generate some "random" IPs for testing, using a simple
// deterministic LCG rather than the builtin Math.random(),
// so that we can directly compare different runs.

var _det_rand_x = 98765.0;
var _det_rand_a = 1103515245;
var _det_rand_c = 12345;
var _det_rand_m = 0x80000000;

function deterministicRandom() {
  _det_rand_x = _det_rand_x * _det_rand_a;
  _det_rand_x = _det_rand_x + _det_rand_c;
  _det_rand_x = _det_rand_x % _det_rand_m;
  return _det_rand_x / _det_rand_m;
}

var testIps = []
for (var x = 0; x < NUM_IPS; x++) {
  testIps.push(ip.fromLong(deterministicRandom() * Math.pow(2, 32)));
} 

// A helper function to print memory usage at various points
// during the execution of the test.

function printMemoryUsage(msg) {
  var heapUsed = process.memoryUsage().heapUsed
  if (global.gc) {
    global.gc();
    var newHeapUsed = process.memoryUsage().heapUsed
    while (newHeapUsed < heapUsed) {
      heapUsed = newHeapUsed
      global.gc();
      newHeapUsed = process.memoryUsage().heapUsed
    }
   
  } else {
    console.warn("Could not force a GC; try `node --expose-gc [..args..]`")
  }
  console.log(msg, heapUsed)
}

printMemoryUsage("Base memory usage of this script:")

var blocklist = new IPBlocklist()
blocklist.load(blocklistFile).then(function() {

  printMemoryUsage("Memory usage after loading the blocklist:")

  var results = []
  var numFound

  for (var run = 0; run < NUM_RUNS; run++) {
    numFound = 0
    var t1 = Date.now();
    for (x = 0; x < NUM_IPS; x++) {
      if (blocklist.contains(testIps[x])) {
        numFound++;
      }
    }
    var t2 = Date.now();
    results.push(t2 - t1);
  }

  console.log("Checked", NUM_IPS, "ips, found", numFound, "in the blocklist")
  console.log("Best time of", NUM_RUNS, "runs:", Math.min.apply(null, results), "ms")
}).then(function() {
  printMemoryUsage("Memory usage after running the test:")
})
