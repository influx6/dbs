require('em')('dbs',function(em){

  var as = em('appstack'),
    nano = em('nano'),
    express = em('express'),
    http = em('http'),
    crypto = em('crypto'),
    couchstore = em('couchstore'),
    util = as.Utility,
    dbs = {};
    
    dbs.Server = as.Class.create('dbs_Server',{
      
      init: function(){
        this.app = express();
        this.server = http.createServer(this.app);
      },

      connect: function(port,ip){
        this.server.listen(port,ip);
      },
      
      socket: function(){
      if(!!this.socket) return this.socket;
        this.socket = require('socket.io').listen(this.server);
      }

    });
    
    
    dbs.Model = as.Class.create('dbs_Model',{
        init: function(id){
          this.id = id;
          this.db = couchstore.use(id);
        },
        create: function(data,id){
          return this.db.save(id || data.id,data);
        },
        all: function(){
          return this.db.all();
        }
    });
    
    dbs.SessionManager = dbs.Model.extend('dbs_SessionManager',{
      init: function(id,secret,options){
        var self = this;
        this.super.init(id);
        this.sessions = dbs.Sessions.make(id,secret,options);
        this.state = this.db.all().then(function(docs){
          if(!docs.body.rows.length) return self.state.resolve(docs);
          return as.Promise.create(function(_){
            util.eachAsync(docs.body.rows,function(e,i,o,fn){ 
                self.sessions.storage.add(e.id,e.value);
                fn(false);
            },function(){
              _.resolve(docs);
            });
          });
        });
      },
      create: function(req,option){
        var self = this;
        return this.state.then(function(){
          return as.Promise.create(self.sessions.find(req,option)).promise();
        }).done(function(session){
           self.db.save(session.id,session);
        });
      },
      analyze: function(req,res,options){
        var self = this, id = this.sessions.analyze(req);

        return this.create(req,options).done(function(session){
          if(session.id === id){
            var ob = util.objectify(req.headers.cookie,'; ','=');
            res.cookies = ob;
            return;
          }
          res.setHeader('Set-Cookie',session.key+'='+session.id);
          if(session.maxAge) 
            res.setHeader('Set-Cookie','Max-Age='+session.maxAge);
          if(session.domain) 
            res.setHeader('Set-Cookie','Domain='+session.domain);
          if(session.path) 
            res.setHeader('Set-Cookie','Path='+session.path);
          if(session.expiration) 
            res.setHeader('Set-Cookie','Expires='+self.sessions.formatExpiration(session.expiration));
          if(session.httpOnly) 
            res.setHeader('Set-Cookie','HttpOnly='+session.httpOnly);

            res.setHeader('Set-Cookie',self.cookieHeader(session));
        });
      },
      cookieHeader: function(session){
        return this.sessions.setCookieHeaders(session);
      }
    });

    dbs.Sessions = as.Class.create('dbs_Sessions',{
      init: function(id,secret,options){
        this.id = id;
        this.storage = as.HashHelpers({});
        this.security = { secret: secret };
        this.options = util.merge({
          path: '/',
          key:'SID',
          maxAge:1000,
          httpOnly: true,
          id:null,
          domain:null,
          data: { history:[],username:null },
          shouldDelete: false,
        },options || {},true);
        this.options.secret = this.crypto(secret);
        if(!!options && !('lifetime' in options)) this.options.lifetime = 86400;
      },
      secret: function(){
        return this.options.secret;
      },
      create: function(req,options){
        if(!!req.session) return this.find(req,options);

        var self = this,
        presession = session = util.clone(this.options),
        id = this.retrieveID(req,session);

        session = util.merge(session,options,true);
        session.id = id;

        if(!!options && options.lifetime){
          if('persistent' in this.options || 'persistent' in options)
            session.persistent = (options.persistent == true ? true : (this.options.persistent == true ? true : false ));
          session.lifetime = options.lifetime;
        }else{
          session.persistent = false;
          session.lifetime = this.options.lifetime;
        }
        
       if(session.key !== this.options.key) session.key = this.options.key;
        session.expiration =(+(new Date)+(session.lifetime*session.maxAge));

        if(req.url){
          //session.path = req.url;
          session.data.history.push(req.url);
        }
        
        req.session = session;
        this.storage.add(id,session);

        return session;
      },
      find: function(req,option){
        var id = this.retrieveID(req,(option || this.options));
        var session = this.storage.get(id);
        if(!session) return this.create(req);
        if(req.url) session.data.history.push(req.url);
        return session;

      },
      destroy: function(req){
        if(!req.session) return
        return this.storage.destroy(req.session.id);
      },
      randomBit: function(){
        return this.secret()+'/'+util.guid();
      },
      crypto: function(key){
        return crypto.createHash('md5').update(key,'utf8').digest('hex');
      },
      analyze: function(req){
        var cookies = req.headers.cookie;
        var sid = new RegExp(this.options.key+'=([^,;]*)').exec(cookies);
        return sid[1];
      },
      retrieveID: function(req,session){
        var sid = this.analyze(req);
        if(!!sid) return sid;
        var bit = this.randomBit();
        session.bit = bit;
        session.uuid = bit.split('/')[1];
        return this.crypto(bit);
      },
      setCookieHeaders: function(session){
        var parts = [session.key+"="+session.id];
        if(session.MaxAge) parts.push('max-age='+session.maxAge);
        if(session.domain) parts.push('domain='+session.domain);
        if(session.path) parts.push('path='+session.path);
        if(session.expiration) parts.push('expires='+this.formatExpiration(session.expiration));
        if(session.httpOnly) parts.push('HttpOnly='+session.httpOnly);

        return parts.join('; ');
      },
      formatExpiration: function(ms){
        var expire = new Date(ms);
        return util.days[expire.getUTCDay()].substring(0,3) + ', '+util.padNumber(expire.getUTCDate())+'-'+util.months[expire.getUTCMonth()].substring(0,3)
        +'-'+expire.getUTCFullYear()+' '+util.padNumber(expire.getUTCHours())+":"+util.padNumber(expire.getUTCSeconds())+' GMT';
      }
    });

    this.exports = dbs;

},this);
