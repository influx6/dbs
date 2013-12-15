var em = require('em');
var as = em('appstack');
var dbs = em('./dbs.js');

require('./specs/server.js').call(as.Matchers,dbs);
require('./specs/session.js').call(as.Matchers,dbs);
