require('em')('Views',function(em){
   this.exports = function(){
      em('./json.js').call(this);
      em('./ejs.js').call(this);
      em('./jade.js').call(this);
      em('./haml.js').call(this);
   };
});
