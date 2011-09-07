var file_to_test = process.ARGV[2];

var path = require('path'),
    vm = require('vm'),
    fs = require('fs');

QUnit = require('./public/qunit/cli.js').QUnit;

//Log failed tests
var number_of_tests_failed = 0;

QUnit.config = {};


//from https://github.com/kof/node-qunit/blob/master/lib/qunit.js

function format(str, f ) {
  switch (f) {
    case 'red':
      return '\033[31m' + str + '\033[39m';
    case 'green':
      return '\033[32m' + str + '\033[39m';
    case 'bold':
      return '\033[1m' + str + '\033[22m';
  }
}

function logTest(obj ) {
  var descr = '[' + (obj.module ? obj.module + ': ' : '') + obj.name + '] ';

  obj.message = obj.message || '';

  if (obj.errorStack) {
    console.warn(format('[Error]' + descr + obj.message, 'red'));
    console.warn('\n' + format(obj.errorStack, 'red'));

  } else {
    console.warn(format('[OK]', 'green') + descr + obj.message);
  }

}


QUnit.done = function(t) {

  t.forEach(function(t) {
    if (t.errorStack) {
      number_of_tests_failed += t.failed;
    }
    logTest(t);
  });

  if (number_of_tests_failed) {
    console.warn('Failed', number_of_tests_failed);
    process.exit(1);

  } else {
    console.log('All success.');
    process.exit(0);
  }
};

require("./"+file_to_test);

QUnit.begin();
