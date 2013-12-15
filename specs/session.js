var em = require('em');
var crypto = em('crypto');
var matcher = em('appstack').Matchers;
var dbz = em('../dbs.js');

var session  = dbz.Sessions.make('blog_sessions','dbzBlogSession',{
    key: 'SPID'
});
var cookie = session.create({ headers: {}},{
  lifetime: 604800,
  persistent: false,
  domain: ".example.org",
});

matcher.obj(session.id).isString();
matcher.obj(session.id).is('blog_sessions');
matcher.obj(session.secret()).isString();
matcher.obj(session.crypto('dbzBlogSession')).is(session.secret());
matcher.obj(session.crypto('dgSession')).isNot(session.secret());
matcher.obj(session.formatExpiration(8406000)).isValid();
matcher.obj(session.formatExpiration(8406000)).isDate();
matcher.obj(cookie).isValid();
matcher.obj(session.setCookieHeaders(cookie)).isValid();
matcher.obj(cookie.id).is(session.crypto(cookie._bit));

