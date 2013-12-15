require('em')('App',function(em){
    
    this.exports = function(id,namespace){
      if(!id && !namespace) throw "Supply Name and Subdomain for application";

      var dbz = em('../dbs.js'), 
        express = em('express'), 
        app = {}, route = '/'.concat(namespace),
        session = id.concat('_sessions');
      
      var as = app.as = dbz.Server.make();
      var am = app.am = dbz.Model.make(id);
      var sm = app.sm = dbz.SessionManager.make(session,session,{
          domain: '/blog',
          lifetime: 604000,
      });
      
      sm.state.done(function(){ console.log('Sessions loaded!'); });

      as.app.get(route,function(req,res){
        am.all().done(function(doc){
            res.send(JSON.stringify(doc));
        }).fail(function(doc){
          res.send('404');
        });
      });
      
      as.app.get(route.concat('/session'),function(req,res){
         sm.analyze(req,res).done(function(session){
            res.send('Awesome Am sessioned!'+'\n'+JSON.stringify(res.cookies));
         });
      });
    
      as.app.post(route.concat('/create'),function(req,res){
        var streams = [];
        req.on('data',function(n){ streams.push(n)});
        req.on('end',function(n){ 
          res.send(200,streams.join('').toString());
        });
      });
      
      as.app.post(route.concat('/authenticate'),function(req,res){
      
      });

      return app;
    };

},this);
