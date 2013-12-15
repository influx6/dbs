module.exports = function(dbs){
  
  var server = dbs.Server.make();

  server.app.get('/',function(req,res){
    res.send('hello!');
  });
  
  server.app.get('/admin',function(req,res){
    res.send('admin!');
  });

  server.connect(3000);

};
