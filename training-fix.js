window.showTrainingDetail=function(trainingId){
const data=trainingData[trainingId];
document.getElementById('training-title').textContent=data.title;
document.getElementById('modal-training-detail').style.display='flex';
const content=document.getElementById('training-content');
let html='';
html+='<div class="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 text-center"><div class="text-6xl mb-3">'+data.icon+'</div><div class="inline-block bg-primary text-white text-xs px-3 py-1 rounded-full mb-2">'+data.category+'</div><p class="text-warm-600 text-sm">'+data.purpose+'</p></div>';
html+='<div class="bg-warm-50 rounded-xl p-4"><div class="flex items-center gap-2 mb-3"><span class="material-icons text-primary text-sm">shopping_bag</span><h3 class="font-semibold text-warm-800">准备物品</h3></div><div class="flex flex-wrap gap-2">';
data.items.forEach(function(item){html+='<span class="bg-white px-3 py-1.5 rounded-lg text-xs text-warm-600 border border-gray-200">'+item+'</span>'});
html+='</div></div>';
html+='<div><div class="flex items-center gap-2 mb-3"><span class="material-icons text-green-500 text-sm">list_alt</span><h3 class="font-semibold text-warm-800">操作步骤</h3></div><div class="space-y-3">';
data.steps.forEach(function(step, idx){
html+='<div class="bg-blue-50 rounded-xl p-4"><div class="flex items-center gap-3 mb-3"><span class="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">'+step.num+'</span><span class="font-medium text-gray-700">'+step.title+'</span></div>';
if(step.image){
html+='<div onclick="openImageViewer('+idx+',\''+trainingId+'\')" class="cursor-pointer rounded-xl overflow-hidden bg-gray-100 hover:bg-gray-200 transition-colors mb-3"><img src="'+step.image+'" alt="'+step.title+'" class="w-32 h-32 object-cover mx-auto"></div>';
}
html+='<p class="text-sm text-warm-600">'+step.desc+'</p></div>';
});
html+='</div></div>';
html+='<div class="bg-yellow-50 rounded-xl p-4"><div class="flex items-center gap-2 mb-2"><span class="material-icons text-yellow-600 text-sm">error</span><h3 class="font-semibold text-yellow-700">常见错误</h3></div><ul class="text-sm text-yellow-700 space-y-1">';
data.commonErrors.forEach(function(err){html+='<li>• '+err+'</li>'});
html+='</ul></div>';
html+='<div class="bg-red-50 rounded-xl p-4"><div class="flex items-center gap-2 mb-2"><span class="material-icons text-red-500 text-sm">warning</span><h3 class="font-semibold text-red-700">风险边界</h3></div><p class="text-sm text-red-600">'+data.risks+'</p></div>';
html+='<div class="bg-purple-50 rounded-xl p-4"><div class="flex items-center gap-2 mb-3"><span class="material-icons text-purple-500 text-sm">help_outline</span><h3 class="font-semibold text-purple-700">微测验</h3></div>';
if(Array.isArray(data.quiz)){
html+='<div id="quiz-container">';
data.quiz.forEach(function(q,i){
html+='<div id="quiz-'+i+'" class="quiz-question'+(i===0?'':' hidden')+'"><p class="text-sm text-warm-600 mb-3">'+(i+1)+'/'+data.quiz.length+'. '+q.question+'</p><div class="space-y-2">';
q.options.forEach(function(o,j){
html+='<button onclick="checkMultiQuiz('+i+','+j+','+q.correct+',\''+trainingId+'\')" class="w-full bg-white rounded-lg py-4 min-h-[48px] text-sm text-warm-600 border border-gray-200 hover:bg-warm-50 hover:border-blue-300 transition-all btn-press">'+String.fromCharCode(65+j)+'. '+o+'</button>';
});
html+='</div><div id="quiz-result-'+i+'" class="mt-3 text-sm hidden"></div></div>';
});
html+='</div>';
}else{
html+='<p class="text-sm text-warm-600 mb-3">'+data.quiz.question+'</p><div class="space-y-2">';
data.quiz.options.forEach(function(o,i){
html+='<button onclick="checkQuiz('+i+','+data.quiz.correct+',\''+trainingId+'\')" class="w-full bg-white rounded-lg py-4 min-h-[48px] text-sm text-warm-600 border border-gray-200 hover:bg-warm-50 hover:border-blue-300 transition-all btn-press">'+String.fromCharCode(65+i)+'. '+o+'</button>';
});
html+='</div><div id="quiz-result" class="mt-3 text-sm hidden"></div>';
}
html+='</div>';
html+='<div class="bg-gray-100 rounded-xl p-4"><p class="text-xs text-warm-500 text-center">⚠️ 免责声明：仅供参考，不能替代专业医疗建议</p></div>';
html+='<button onclick="closeTrainingDetail()" class="w-full bg-primary text-white rounded-xl py-4 min-h-[48px] font-semibold btn-press">完成学习</button>';
content.innerHTML=html;
};

window.openImageViewer=function(idx,trainingId){
const data=trainingData[trainingId];
const step=data.steps[idx];
if(!step||!step.image)return;
let html='';
html+='<div id="image-viewer" class="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">';
html+='<button onclick="closeImageViewer()" class="absolute top-4 right-4 text-white text-3xl">&times;</button>';
html+='<button onclick="prevImage('+idx+',\''+trainingId+'\')" class="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300">‹</button>';
html+='<button onclick="nextImage('+idx+',\''+trainingId+'\')" class="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300">›</button>';
html+='<div class="text-white text-lg font-semibold mb-4">步骤'+step.num+'：'+step.title+'</div>';
html+='<img src="'+step.image+'" alt="'+step.title+'" class="max-w-full max-h-[70vh] object-contain">';
html+='<div class="text-white text-sm mt-4">'+(idx+1)+'/'+data.steps.length+'</div>';
html+='<div class="text-gray-300 text-xs mt-2 px-8 text-center">'+step.desc+'</div>';
html+='</div>';
document.body.insertAdjacentHTML('beforeend',html);
};

window.closeImageViewer=function(){
const viewer=document.getElementById('image-viewer');
if(viewer)viewer.remove();
};

window.prevImage=function(idx,trainingId){
const data=trainingData[trainingId];
if(idx>0){
closeImageViewer();
openImageViewer(idx-1,trainingId);
}
};

window.nextImage=function(idx,trainingId){
const data=trainingData[trainingId];
if(idx<data.steps.length-1){
closeImageViewer();
openImageViewer(idx+1,trainingId);
}
};

window.checkMultiQuiz=function(qIdx,selected,correct,trainingId){
const quizResult=document.getElementById('quiz-result-'+qIdx);
const buttons=document.querySelectorAll('#quiz-'+qIdx+' button');
buttons.forEach(function(btn,idx){
btn.disabled=true;
if(idx===correct){btn.classList.add('bg-green-100','border-green-500','text-green-700');btn.classList.remove('bg-white','border-gray-200','text-warm-600')}
else if(idx===selected&&idx!==correct){btn.classList.add('bg-red-100','border-red-500','text-red-700');btn.classList.remove('bg-white','border-gray-200','text-warm-600')}
});
if(selected===correct){quizResult.innerHTML='✅ 回答正确！';quizResult.className='mt-3 text-sm text-green-600'}
else{quizResult.innerHTML='❌ 回答错误';quizResult.className='mt-3 text-sm text-red-600'}
quizResult.classList.remove('hidden');
const data=trainingData[trainingId];
if(qIdx<data.quiz.length-1){setTimeout(function(){document.getElementById('quiz-'+qIdx).classList.add('hidden');document.getElementById('quiz-'+(qIdx+1)).classList.remove('hidden')},1500)}
else{setTimeout(function(){document.getElementById('quiz-container').innerHTML='<div class="text-center py-6"><div class="text-4xl mb-3">🎉</div><h4 class="font-semibold text-warm-800 mb-2">恭喜完成测验！</h4><p class="text-sm text-warm-500">你已经掌握了术后翻身的技巧</p></div>'},1500)}
};