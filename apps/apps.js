require('em')('Apps',function(em){
   this.exports = function(){
      em('./admin.js').call(this);
   };
},this);
