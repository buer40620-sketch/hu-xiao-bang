(function() {
    const pages = ['home', 'setup', 'roadmap', 'todo', 'training', 'check', 'support', 'share'];
    let history = [];
    let currentScenario = 'post-op-night';
    let isNightMode = false;
    let currentRecordType = '';
    let currentQuestionIndex = 0;
    let correctCount = 0;
    let answeredQuestions = [];
    let currentStage = 'day1';
    
    const careBackground = {
        surgeryType: '',
        postOpDays: 1,
        customSurgery: ''
    };
    
    const Storage = {
        get: function(key, defaultValue) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch (e) {
                console.error('Storage get error:', e);
                return defaultValue;
            }
        },
        set: function(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('Storage set error:', e);
            }
        }
    };

    const UI = {
        showToast: function(message) {
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg z-50';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        },
        createCard: function(title, content, options = {}) {
            const bgClass = options.bgClass || 'bg-white';
            const borderClass = options.borderClass || '';
            const icon = options.icon || '';
            return `
                <div class="${bgClass} rounded-2xl p-4 card-shadow mb-4 ${borderClass}">
                    <div class="flex items-center gap-2 mb-3">
                        ${icon ? `<span class="text-lg">${icon}</span>` : ''}
                        <h4 class="font-semibold text-warm-800">${title}</h4>
                    </div>
                    ${content}
                </div>
            `;
        },
        createTimeline: function(items) {
            return `
                <div class="relative">
                    <div class="timeline-line"></div>
                    <div class="space-y-4">
                        ${items.map((item, idx) => `
                            <div class="relative pl-8">
                                <div class="absolute left-0 top-0 w-6 h-6 ${item.color} rounded-full flex items-center justify-center">
                                    <span class="text-white text-xs">${idx + 1}</span>
                                </div>
                                <div>
                                    <div class="font-medium text-warm-800 text-sm">${item.title}</div>
                                    <div class="text-warm-500 text-xs mt-1">${item.desc}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    };

    function init() {
        bindEvents();
        loadInitialState();
    }

    function bindEvents() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') searchCare();
            });
        }

        const searchBtn = document.querySelector('#search-input + button');
        if (searchBtn) {
            searchBtn.addEventListener('click', searchCare);
        }

        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                selectScenario(this.dataset.scenario);
            });
        });

        const nightModeBtn = document.getElementById('night-mode-btn');
        if (nightModeBtn) {
            nightModeBtn.addEventListener('click', toggleNightMode);
        }


    }

    function loadInitialState() {
        currentScenario = Storage.get('currentScenario', 'post-op-night');
        const savedScenario = document.querySelector(`[data-scenario="${currentScenario}"]`);
        if (savedScenario) savedScenario.classList.add('active-card');
        const savedBackground = Storage.get('careBackground', null);
        if (savedBackground) {
            careBackground.surgeryType = savedBackground.surgeryType || '';
            careBackground.postOpDays = parseInt(savedBackground.postOpDays) || 1;
            careBackground.customSurgery = savedBackground.customSurgery || '';
        }
        currentStage = getStageByDays(careBackground.postOpDays);
    }

    function goToPage(pageId) {
        pages.forEach(p => document.getElementById(`page-${p}`).classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.add('active');
        history.push(pageId);
        
        loadPageData(pageId);
    }

    function loadPageData(pageId) {
        switch(pageId) {
            case 'todo':
                loadTodoState();
                loadRecords();
                break;
            case 'training':
                updateTrainingCompletion();
                break;
            case 'check':
                loadCarePackage();
                loadCheckContent();
                break;
            case 'support':
                loadSupportContent();
                break;
            case 'share':
                loadShareContent();
                break;
            case 'roadmap':
                loadScenarioData();
                break;
        }
    }

    function goBack() {
        history.pop();
        const prevPage = history.length > 0 ? history[history.length - 1] : 'home';
        
        if (prevPage === 'roadmap') {
            loadScenarioData();
        }
        
        pages.forEach(p => document.getElementById(`page-${p}`).classList.remove('active'));
        document.getElementById(`page-${prevPage}`).classList.add('active');
    }

    function selectScenario(scenarioId) {
        currentScenario = scenarioId;
        Storage.set('currentScenario', scenarioId);
        
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.classList.remove('active-card');
        });
        const btn = document.querySelector(`[data-scenario="${scenarioId}"]`);
        if (btn) btn.classList.add('active-card');
        
        if (scenarioId === 'post-op-night') {
            goToPage('setup');
        } else {
            loadScenarioData();
            goToPage('roadmap');
        loadScenarioData();
        }
    }

    function searchCare() {
        const input = document.getElementById('search-input');
        const results = document.getElementById('search-results');
        const query = input.value.trim().toLowerCase();
        
        if (!query) {
            results.innerHTML = '';
            results.classList.add('hidden');
            return;
        }
        
        const searchMap = [
            { keywords: ['翻身', '拍背', '压疮'], page: 'training', title: '翻身拍背训练', desc: '学习正确的翻身拍背方法' },
            { keywords: ['疼痛', '止痛药'], page: 'todo', title: '疼痛管理', desc: '查看疼痛记录和管理方法' },
            { keywords: ['体温', '发烧'], page: 'todo', title: '体温记录', desc: '记录体温并查看正常范围' },
            { keywords: ['排尿', '尿量'], page: 'todo', title: '排尿记录', desc: '记录排尿情况' },
            { keywords: ['查房', '医生', '护士'], page: 'check', title: '查房交班', desc: '准备查房问题和交班内容' },
            { keywords: ['复诊', '复查'], page: 'check', title: '复诊准备', desc: '准备复诊问题和康复记录' },
            { keywords: ['累', '疲惫', '休息', '续航'], page: 'support', title: '照护者续航', desc: '查看减负建议和休息提醒' },
            { keywords: ['伤口', '换药'], page: 'training', title: '伤口护理训练', desc: '学习伤口护理方法' },
            { keywords: ['饮食', '吃什么'], page: 'roadmap', title: '照护路线图', desc: '查看饮食建议' },
            { keywords: ['康复', '训练'], page: 'training', title: '康复训练', desc: '学习康复训练方法' }
        ];
        
        const matches = searchMap.filter(item => 
            item.keywords.some(k => query.includes(k))
        );
        
        if (matches.length > 0) {
            results.innerHTML = `
                <div class="bg-white rounded-xl p-3 card-shadow">
                    <h4 class="text-sm font-semibold text-gray-700 mb-2">找到相关内容：</h4>
                    <div class="space-y-2">
                        ${matches.map(item => `
                            <div onclick="goToPage('${item.page}'); document.getElementById('search-input').value=''; document.getElementById('search-results').classList.add('hidden');" 
                                 class="flex items-center gap-3 p-2 rounded-lg hover:bg-warm-50 cursor-pointer">
                                <span class="text-lg">📌</span>
                                <div>
                                    <div class="text-sm font-medium text-warm-800">${item.title}</div>
                                    <div class="text-xs text-warm-500">${item.desc}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            results.classList.remove('hidden');
        } else {
            results.innerHTML = `
                <div class="bg-white rounded-xl p-3 card-shadow">
                    <p class="text-sm text-warm-500">没找到相关内容，试试搜索这些：翻身、疼痛、体温、查房、累</p>
                </div>
            `;
            results.classList.remove('hidden');
        }
    }

    function updateTrainingCompletion() {
        const quizHistory = Storage.get('quizHistory', {});
        const trainingIds = ['turn-body', 'pressure', 'drainage', 'pain', 'ambulation', 'wound-dressing', 'bath', 'oxygen'];
        let completedCount = 0;
        
        trainingIds.forEach(id => {
            const card = document.querySelector(`[data-training="${id}"]`);
            if (card) {
                const oldBadge = card.querySelector('.completion-badge');
                if (oldBadge) oldBadge.remove();
                
                if (quizHistory[id] && quizHistory[id].isCorrect) {
                    completedCount++;
                    const badge = document.createElement('div');
                    badge.className = 'completion-badge absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center check-pop';
                    badge.innerHTML = '<span class="text-white text-sm font-bold">✓</span>';
                    card.style.position = 'relative';
                    card.appendChild(badge);
                }
            }
        });
        
        const badgeEl = document.getElementById('training-badge');
        if (completedCount > 0 && badgeEl) {
            badgeEl.textContent = `今晚必学科目：${completedCount}/4 完成`;
            badgeEl.classList.remove('hidden');
        }
    }

    function loadScenarioData() {
        const roadmapContent = document.getElementById('roadmap-content');
        if (!roadmapContent) return;
        
        const postOpContent = generatePostOpContent();
        const homeRecoveryContent = generateHomeRecoveryContent();
        
        let scenarioData;
        if (currentScenario === 'post-op-night' && stageContent[currentStage]) {
            const stage = stageContent[currentStage];
            scenarioData = {
                'post-op-night': { title: stage.title, subtitle: stage.subtitle, badge: stage.badge, content: postOpContent }
            };
        } else {
            scenarioData = {
                'post-op-night': { title: '今晚照护路线图', subtitle: '妈妈刚做完手术，这是最关键的24小时', badge: '🌙 住院第1晚 · 术后陪护', content: postOpContent },
                'home-recovery': { title: '回家康养路线图', subtitle: '出院后的居家照护要点', badge: '🏠 出院回家 · 康复照护', content: homeRecoveryContent }
            };
        }
        
        const data = scenarioData[currentScenario];
        
        const stageSelector = document.getElementById('stage-selector');
        if (stageSelector) {
            if (currentScenario === 'post-op-night') {
                stageSelector.classList.remove('hidden');
                document.querySelectorAll('.stage-btn').forEach(btn => {
                    btn.classList.remove('bg-primary', 'text-white');
                    btn.classList.add('bg-warm-50', 'text-warm-700');
                });
                const activeBtn = document.querySelector(`[data-stage="${currentStage}"]`);
                if (activeBtn) {
                    activeBtn.classList.remove('bg-warm-50', 'text-warm-700');
                    activeBtn.classList.add('bg-primary', 'text-white');
                }
            } else {
                stageSelector.classList.add('hidden');
            }
        }
        const badgeEl = document.querySelector('#page-roadmap .inline-flex');
        const titleEl = document.querySelector('#page-roadmap h1');
        const subtitleEl = document.querySelector('#page-roadmap p.text-warm-500');
        
        if (badgeEl) badgeEl.innerHTML = `<span>${data.badge.split('·')[0]}</span><span>·${data.badge.split('·')[1]}</span>`;
        if (titleEl) titleEl.textContent = data.title;
        if (subtitleEl) subtitleEl.textContent = data.subtitle;
        roadmapContent.innerHTML = data.content;
        
        const checkBtn = document.getElementById('btn-check');
        const emergencyBtn = document.getElementById('emergency-btn');
        
        if (currentScenario === 'post-op-night') {
            if (checkBtn) checkBtn.innerHTML = '<span class="material-icons text-sm">description</span><span>查房交班</span>';
            if (emergencyBtn) emergencyBtn.innerHTML = '<span class="material-icons text-2xl">emergency</span><span>紧急呼叫护士</span>';
        } else {
            if (checkBtn) checkBtn.innerHTML = '<span class="material-icons text-sm">description</span><span>复诊准备</span>';
            if (emergencyBtn) emergencyBtn.innerHTML = '<span class="material-icons text-2xl">emergency</span><span>紧急就医</span>';
        }
        try {
            loadMedications();
            checkMedicationReminder();
            setInterval(checkMedicationReminder, 60000);
        } catch (e) {
            console.error('Medication init error:', e);
        }
    }

    function generatePostOpContent() {
        const checkinData = Storage.get('caregiverCheckin', {});
        const currentStageData = stageContent[currentStage] || stageContent.day1;
        const selectedEvents = Storage.get('dailyEvents', []);
        const personalizedPoints = getPersonalizedPainPoints(postOpPainPoints, checkinData);
        
        const painPointsHtml = personalizedPoints.map(point => `
            <div class="bg-white/70 rounded-xl p-3">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-lg">${point.icon}</span>
                    <span class="font-semibold text-gray-700 text-sm">${point.title}</span>
                </div>
                <p class="text-xs text-warm-600 mb-2">${point.desc}</p>
                <div class="flex items-center gap-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                    <span>💡</span>
                    <span>${point.advice}</span>
                </div>
            </div>
        `).join('');
        
        const savedBg = Storage.get('careBackground', null);
        const savedSurgeryType = savedBg ? savedBg.surgeryType : '';
        const savedPostOpDays = savedBg ? parseInt(savedBg.postOpDays) || 1 : 1;
        
        const surgeryMap = { 'orthopedic': '骨科', 'abdominal': '腹部', 'cardiac': '心脏', 'brain': '脑部' };
        const st = savedSurgeryType;
        const mappedType = surgeryMap[st] || st;
        const surgeryType = (st && st !== 'general' && st !== 'custom') ? mappedType : (savedBg && savedBg.customSurgery || '骨科');
        const stage = getStageByDays(savedPostOpDays);
        const roadmap = roadmapData[surgeryType] && roadmapData[surgeryType][stage] ? roadmapData[surgeryType][stage] : roadmapData['骨科']['day1'];
        
        const todayFocusHtml = roadmap.todayFocus.map((item, idx) => `
            <div class="flex items-start gap-3">
                <div class="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">${idx + 1}</div>
                <div>
                    <p class="font-medium text-warm-800 text-sm">${item}</p>
                </div>
            </div>
        `).join('');
        
        const todoHtml = roadmap.todo.map((item, idx) => `
            <div class="flex items-start gap-3">
                <div class="w-5 h-5 bg-white border-2 border-gray-300 rounded flex-shrink-0 mt-0.5"></div>
                <p class="text-sm text-warm-700">${item}</p>
            </div>
        `).join('');
        
        const specialNotesHtml = roadmap.specialNotes.map((item, idx) => `
            <div class="bg-white/70 rounded-xl p-3">
                <div class="flex items-start gap-2">
                    <span class="text-sm">⚠️</span>
                    <p class="text-xs text-warm-600">${item}</p>
                </div>
            </div>
        `).join('');
        
        const emergencyHtml = roadmap.emergency.map((item, idx) => `
            <div class="bg-white/60 rounded-lg p-2 text-sm text-red-700 font-medium">${item}</div>
        `).join('');
        
        const checkInQuestionsHtml = roadmap.checkInQuestions.map((item, idx) => `
            <div class="flex items-start gap-2">
                <span class="text-sm">❓</span>
                <p class="text-sm text-warm-700">${item}</p>
            </div>
        `).join('');
        
        return `
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100 mb-4">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-white text-sm">🤝</span>
                    </div>
                    <div>
                        <h4 class="font-semibold text-warm-800 text-sm">我理解你现在的感受</h4>
                        <p class="text-warm-600 text-sm mt-1">第一次陪床，面对这么多管子和仪器，慌是正常的。你不是一个人，我帮你一步步来。</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-primary rounded-2xl p-4 text-white mb-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="material-icons text-sm">warning</span>
                    <h4 class="font-semibold">当前局面</h4>
                </div>
                <p class="text-blue-50 text-sm">${surgeryType}术后第${savedPostOpDays}天，生命体征稳定，但疼痛和护理是最大挑战。你的任务是观察、记录，有异常及时叫护士。</p>
            </div>
            
            ${UI.createCard('今日重点', `
                <div class="space-y-3">
                    ${todayFocusHtml}
                </div>
            `, { icon: '✨' })}
            
            ${UI.createCard('📋 今日Todo', `
                <div class="space-y-2">
                    ${todoHtml}
                </div>
            `)}
            
            ${UI.createCard('💊 用药清单', `
                <div id="medication-list" class="space-y-2">
                    <div class="text-center text-warm-500 text-sm py-4">暂无用药记录，点击下方添加</div>
                </div>
                <button onclick="openAddMedication()" class="w-full mt-3 bg-primary text-white rounded-xl py-2 font-semibold btn-press text-sm">+ 添加用药</button>
            `)}
            
            <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 mb-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-xl">⚠️</span>
                    <h4 class="font-bold text-amber-800">特别注意</h4>
                </div>
                <div class="space-y-3">
                    ${specialNotesHtml}
                </div>
            </div>
            
            <div class="bg-red-50 rounded-2xl p-4 border-2 border-red-200 mb-4 risk-pulse">
                <h3 class="font-bold text-red-600 mb-2 flex items-center gap-2 text-sm">
                    <span class="material-icons text-red-500 text-base">error</span>
                    异常马上联系医护
                    <span class="text-xs font-normal bg-red-500 text-white px-2 py-0.5 rounded-full ml-auto">立即呼叫</span>
                </h3>
                <div class="grid grid-cols-2 gap-2">
                    ${emergencyHtml}
                </div>
            </div>
            
            ${UI.createCard('❓ 查房要问', `
                <div class="space-y-3">
                    ${checkInQuestionsHtml}
                </div>
            `)}
            
            ${UI.createCard('时间路径', UI.createTimeline([
                { title: '现在', desc: '确认呼叫铃位置，记录疼痛和用药时间', color: 'bg-primary' },
                { title: '今晚', desc: '按医嘱翻身、观察引流、记录情况', color: 'bg-secondary' },
                { title: '明早', desc: '准备查房问题，整理交班内容', color: 'bg-green-500' }
            ]))}
            
            ${UI.createCard('谁来帮', `
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-blue-50 rounded-xl p-3 text-center">
                        <div class="text-lg mb-1">👩‍⚕️</div>
                        <div class="text-xs font-medium text-blue-700">护士</div>
                        <div class="text-xs text-warm-500 mt-1">处理医疗异常、换液、伤口护理</div>
                    </div>
                    <div class="bg-orange-50 rounded-xl p-3 text-center">
                        <div class="text-lg mb-1">🏥</div>
                        <div class="text-xs font-medium text-orange-700">护工</div>
                        <div class="text-xs text-warm-500 mt-1">体力护理、翻身、清洁</div>
                    </div>
                    <div class="bg-green-50 rounded-xl p-3 text-center">
                        <div class="text-lg mb-1">👨‍👩‍👧</div>
                        <div class="text-xs font-medium text-green-700">家人</div>
                        <div class="text-xs text-warm-500 mt-1">买饭、资料、替班</div>
                    </div>
                    <div class="bg-purple-50 rounded-xl p-3 text-center">
                        <div class="text-lg mb-1">🙋</div>
                        <div class="text-xs font-medium text-purple-700">自己</div>
                        <div class="text-xs text-warm-500 mt-1">观察、记录、情感陪伴</div>
                    </div>
                </div>
            `)}
            
            <div class="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-100 mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-warm-800">你的状态</h3>
                    <span class="text-xs bg-secondary text-white px-2 py-1 rounded-full">需要关注</span>
                </div>
                <div class="flex items-center gap-4 text-sm">
                    <div class="flex items-center gap-2">
                        <span>😴</span>
                        <span class="text-warm-600">已连续工作5小时</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span>💧</span>
                        <span class="text-warm-600">饮水不足</span>
                    </div>
                </div>
            </div>
        `;
    }

    function generateHomeRecoveryContent() {
        const checkinData = Storage.get('caregiverCheckin', {});
        const personalizedPoints = getPersonalizedPainPoints(homeCarePainPoints, checkinData);
        
        const painPointsHtml = personalizedPoints.map(point => `
            <div class="bg-white/70 rounded-xl p-3">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-lg">${point.icon}</span>
                    <span class="font-semibold text-gray-700 text-sm">${point.title}</span>
                </div>
                <p class="text-xs text-warm-600 mb-2">${point.desc}</p>
                <div class="flex items-center gap-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                    <span>💡</span>
                    <span>${point.advice}</span>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-4 border border-green-100 mb-4">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-white text-sm">🏠</span>
                    </div>
                    <div>
                        <h4 class="font-semibold text-warm-800 text-sm">欢迎回家</h4>
                        <p class="text-warm-600 text-sm mt-1">终于可以在家照顾妈妈了，虽然环境熟悉，但康复之路还很长。慢慢来，你已经做得很好了。</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-teal-500 rounded-2xl p-4 text-white mb-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="material-icons text-sm">home</span>
                    <h4 class="font-semibold">当前局面</h4>
                </div>
                <p class="text-teal-50 text-sm">妈妈刚出院回家，需要逐步恢复体力。居家环境更舒适，但照护责任完全落在你身上。注意观察伤口、饮食和活动情况。</p>
            </div>
            
            ${UI.createCard('先做好这3件事', `
                <div class="space-y-3">
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                        <div>
                            <p class="font-medium text-warm-800 text-sm">整理舒适的休养区域</p>
                            <p class="text-warm-500 text-xs mt-0.5">保持室温适宜，光线柔和，方便妈妈休息</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                        <div>
                            <p class="font-medium text-warm-800 text-sm">准备好康复所需物品</p>
                            <p class="text-warm-500 text-xs mt-0.5">拐杖、助行器、康复训练带、常用药品都要放在手边</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                        <div>
                            <p class="font-medium text-warm-800 text-sm">安排好每日照护时间表</p>
                            <p class="text-warm-500 text-xs mt-0.5">定时用药、翻身、康复训练、饮食，规律最重要</p>
                        </div>
                    </div>
                </div>
            `, { icon: '🏡' })}
            
            ${UI.createCard('💊 用药清单', `
                <div id="medication-list" class="space-y-2">
                    <div class="text-center text-warm-500 text-sm py-4">暂无用药记录，点击下方添加</div>
                </div>
                <button onclick="openAddMedication()" class="w-full mt-3 bg-primary text-white rounded-xl py-2 font-semibold btn-press text-sm">+ 添加用药</button>
            `)}
            
            <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200 mb-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-xl">🏠</span>
                    <h4 class="font-bold text-emerald-800">居家康复可能遇到</h4>
                </div>
                <div class="space-y-3">
                    ${painPointsHtml}
                </div>
            </div>
            
            <div class="bg-red-50 rounded-2xl p-4 border-2 border-red-200 mb-4">
                <h3 class="font-bold text-red-600 mb-2 flex items-center gap-2 text-sm">
                    <span class="material-icons text-red-500 text-base">error</span>
                    风险红旗
                    <span class="text-xs font-normal bg-red-500 text-white px-2 py-0.5 rounded-full ml-auto">立即就医</span>
                </h3>
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-white/60 rounded-lg p-2 text-sm text-red-700 font-medium">突发异常情况</div>
                    <div class="bg-white/60 rounded-lg p-2 text-sm text-red-700 font-medium">伤口渗血严重</div>
                    <div class="bg-white/60 rounded-lg p-2 text-sm text-red-700 font-medium">呼吸困难</div>
                    <div class="bg-white/60 rounded-lg p-2 text-sm text-red-700 font-medium">高烧不退</div>
                </div>
            </div>
            
            ${UI.createCard('康复时间线', UI.createTimeline([
                { title: '本周（回家初期）', desc: '伤口愈合期，注意清洁消毒，避免剧烈活动', color: 'bg-teal-500' },
                { title: '第2-3周（康复期）', desc: '逐步增加活动量，进行康复训练，注意饮食调理', color: 'bg-emerald-500' },
                { title: '第4周（复诊准备）', desc: '准备复诊资料，检查恢复情况，咨询后续康复建议', color: 'bg-green-500' }
            ]))}
            
            ${UI.createCard('谁来帮', `
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-blue-50 rounded-xl p-3 text-center">
                        <div class="text-lg mb-1">🏥</div>
                        <div class="text-xs font-medium text-blue-700">社区医院</div>
                        <div class="text-xs text-warm-500 mt-1">日常换药、健康咨询</div>
                    </div>
                    <div class="bg-orange-50 rounded-xl p-3 text-center">
                        <div class="text-lg mb-1">👨‍⚕️</div>
                        <div class="text-xs font-medium text-orange-700">家庭医生</div>
                        <div class="text-xs text-warm-500 mt-1">定期上门、用药指导</div>
                    </div>
                    <div class="bg-green-50 rounded-xl p-3 text-center">
                        <div class="text-lg mb-1">👨‍👩‍👧</div>
                        <div class="text-xs font-medium text-green-700">家人</div>
                        <div class="text-xs text-warm-500 mt-1">轮流看护、情感支持</div>
                    </div>
                    <div class="bg-purple-50 rounded-xl p-3 text-center">
                        <div class="text-lg mb-1">🙋</div>
                        <div class="text-xs font-medium text-purple-700">自己</div>
                        <div class="text-xs text-warm-500 mt-1">日常照护、康复训练</div>
                    </div>
                </div>
            `)}
            
            <div class="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-4 border border-green-100 mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-warm-800">你的状态</h3>
                    <span class="text-xs bg-green-500 text-white px-2 py-1 rounded-full">平稳</span>
                </div>
                <div class="flex items-center gap-4 text-sm">
                    <div class="flex items-center gap-2">
                        <span>🏠</span>
                        <span class="text-warm-600">在家照护第1天</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span>💪</span>
                        <span class="text-warm-600">保持规律作息</span>
                    </div>
                </div>
            </div>
        `;
    }

    function toggleTask(taskId) {
        const btn = document.getElementById(taskId + '-btn');
        const list = document.getElementById('todo-list');
        const tasks = list.querySelectorAll('[id$="-btn"]');
        let completed = 0;
        
        if (btn.classList.contains('bg-primary')) {
            btn.classList.remove('bg-primary', 'border-blue-500');
            btn.classList.add('border-gray-300');
            btn.innerHTML = '';
        } else {
            btn.classList.add('bg-primary', 'border-blue-500');
            btn.classList.remove('border-gray-300');
            btn.innerHTML = '<span class="text-white text-xs check-pop">✓</span>';
        }
        
        tasks.forEach(t => { if (t.classList.contains('bg-primary')) completed++; });
        
        const progress = (completed / tasks.length) * 100;
        document.getElementById('todo-progress-bar').style.width = progress + '%';
        document.getElementById('todo-progress-text').textContent = completed + '/' + tasks.length;
        
        saveTodoState();
    }

    function saveTodoState() {
        const state = {};
        document.querySelectorAll('[id$="-btn"]').forEach(btn => {
            state[btn.id.replace('-btn', '')] = btn.classList.contains('bg-primary');
        });
        Storage.set('todoState', state);
    }

    function addTodo(customKey) {
        const customTodos = Storage.get('customTodos', {});
        const currentList = customTodos[customKey] || [];
        const newItem = prompt('请输入新任务内容：');
        if (newItem && newItem.trim()) {
            currentList.push(newItem.trim());
            customTodos[customKey] = currentList;
            Storage.set('customTodos', customTodos);
            refreshTodoPage();
        }
    }

    function editTodo(customKey, idx) {
        const customTodos = Storage.get('customTodos', {});
        const currentList = customTodos[customKey] || [];
        if (currentList[idx]) {
            const newItem = prompt('请修改任务内容：', currentList[idx]);
            if (newItem !== null) {
                if (newItem.trim()) {
                    currentList[idx] = newItem.trim();
                    customTodos[customKey] = currentList;
                    Storage.set('customTodos', customTodos);
                } else {
                    currentList.splice(idx, 1);
                    customTodos[customKey] = currentList;
                    Storage.set('customTodos', customTodos);
                }
                refreshTodoPage();
            }
        }
    }

    function deleteTodo(customKey, idx) {
        if (confirm('确定要删除这个任务吗？')) {
            const customTodos = Storage.get('customTodos', {});
            const currentList = customTodos[customKey] || [];
            currentList.splice(idx, 1);
            if (currentList.length === 0) {
                delete customTodos[customKey];
            } else {
                customTodos[customKey] = currentList;
            }
            Storage.set('customTodos', customTodos);
            refreshTodoPage();
        }
    }

    function resetTodos(customKey, st, postOpDays) {
        if (confirm('确定要重置为默认任务吗？自定义任务将被清除。')) {
            const customTodos = Storage.get('customTodos', {});
            
            const surgeryMap = { 'orthopedic': '骨科', 'abdominal': '腹部', 'cardiac': '心脏', 'brain': '脑部' };
            const mappedType = surgeryMap[st] || st;
            const surgeryType = (st && st !== 'general' && st !== 'custom') ? mappedType : '骨科';
            const stage = getStageByDays(postOpDays);
            const roadmap = roadmapData[surgeryType] && roadmapData[surgeryType][stage] ? roadmapData[surgeryType][stage] : roadmapData['骨科']['day1'];
            
            customTodos[customKey] = [...roadmap.todo];
            Storage.set('customTodos', customTodos);
            refreshTodoPage();
        }
    }

    function refreshTodoPage() {
        document.getElementById('todo-list').innerHTML = generatePostOpTodoItems();
        Storage.set('todoState', {});
        const today = new Date().toLocaleDateString('zh-CN');
        document.getElementById('todo-subtitle').textContent = '🌙 住院第1晚 · ' + today;
        document.getElementById('todo-progress-bar').style.width = '0%';
        document.getElementById('todo-progress-text').textContent = '0/' + document.querySelectorAll('[id$="-btn"]').length;
    }

    function loadTodoState() {
        const today = new Date().toLocaleDateString('zh-CN');
        
        if (currentScenario === 'post-op-night') {
            document.getElementById('todo-subtitle').textContent = '🌙 住院第1晚 · ' + today;
            document.getElementById('todo-list').innerHTML = generatePostOpTodoItems();
            document.querySelector('#page-todo button.bg-red-500').innerHTML = '<span class="material-icons text-2xl">emergency</span><span>紧急呼叫护士</span>';
        } else {
            document.getElementById('todo-subtitle').textContent = '🏠 出院回家 · ' + today;
            document.getElementById('todo-list').innerHTML = generateHomeTodoItems();
            document.querySelector('#page-todo button.bg-red-500').innerHTML = '<span class="material-icons text-2xl">emergency</span><span>紧急就医</span>';
        }
        
        const saved = Storage.get('todoState', {});
        Object.keys(saved).forEach(taskId => {
            const btn = document.getElementById(taskId + '-btn');
            if (btn && saved[taskId]) {
                btn.classList.add('bg-primary', 'border-blue-500');
                btn.classList.remove('border-gray-300');
                btn.innerHTML = '<span class="text-white text-xs">✓</span>';
            }
        });
        
        const tasks = document.querySelectorAll('[id$="-btn"]');
        let completed = 0;
        tasks.forEach(t => { if (t.classList.contains('bg-primary')) completed++; });
        const progress = (completed / tasks.length) * 100;
        document.getElementById('todo-progress-bar').style.width = progress + '%';
        document.getElementById('todo-progress-text').textContent = completed + '/' + tasks.length;
    }

    function generatePostOpTodoItems() {
        const savedBg = Storage.get('careBackground', null);
        const savedSurgeryType = savedBg ? savedBg.surgeryType : '';
        const savedPostOpDays = savedBg ? parseInt(savedBg.postOpDays) || 1 : 1;
        
        const surgeryMap = { 'orthopedic': '骨科', 'abdominal': '腹部', 'cardiac': '心脏', 'brain': '脑部' };
        const st = savedSurgeryType;
        const mappedType = surgeryMap[st] || st;
        const surgeryType = (st && st !== 'general' && st !== 'custom') ? mappedType : (savedBg && savedBg.customSurgery || '骨科');
        const stage = getStageByDays(savedPostOpDays);
        const roadmap = roadmapData[surgeryType] && roadmapData[surgeryType][stage] ? roadmapData[surgeryType][stage] : roadmapData['骨科']['day1'];
        
        const customKey = `${st}_${stage}`;
        const customTodos = Storage.get('customTodos', {});
        
        if (!customTodos[customKey]) {
            customTodos[customKey] = [...roadmap.todo];
            Storage.set('customTodos', customTodos);
        }
        
        const items = customTodos[customKey];
        const hasCustom = JSON.stringify(items) !== JSON.stringify(roadmap.todo);
        
        const priorities = ['重要', '常规', '照护自己', '别睡着'];
        const priorityColors = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-red-100 text-red-600'];
        
        const todoItems = items.map((item, idx) => {
            const priority = priorities[idx % priorities.length];
            const colorClass = priorityColors[idx % priorities.length];
            
            return `
                <div class="bg-white rounded-2xl p-4 card-shadow group">
                    <div class="flex items-start gap-3">
                        <button onclick="toggleTask('todo-${idx}')" id="todo-${idx}-btn" class="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5 btn-press"></button>
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <span class="font-semibold text-warm-800">${item}</span>
                                <span class="text-xs ${colorClass} px-2 py-0.5 rounded-full">${priority}</span>
                            </div>
                            <p class="text-warm-500 text-sm mt-1">照护任务，完成后请勾选</p>
                            <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                <span>📋 ${hasCustom ? '可编辑' : '路线图任务'}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="editTodo('${customKey}', ${idx})" class="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-all btn-press">
                                <span class="material-icons text-sm">edit_note</span>
                            </button>
                            <button onclick="deleteTodo('${customKey}', ${idx})" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all btn-press">
                                <span class="material-icons text-sm">delete_outline</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        const addButton = `
            <div class="bg-white/60 rounded-2xl p-4 border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all cursor-pointer" onclick="addTodo('${customKey}')">
                <div class="flex items-center justify-center gap-2 text-primary/70 hover:text-primary transition-colors">
                    <span class="material-icons text-lg">add</span>
                    <span class="text-sm font-medium">添加任务</span>
                </div>
            </div>
        `;
        
        const resetButton = hasCustom ? `
            <div class="text-center mt-4">
                <button onclick="resetTodos('${customKey}', '${st}', ${savedPostOpDays})" class="text-xs text-gray-400 hover:text-primary transition-colors">
                    ↩️ 重置为默认任务
                </button>
            </div>
        ` : '';
        
        return todoItems + addButton + resetButton;
    }

    function generateHomeTodoItems() {
        return `
            <div class="bg-white rounded-2xl p-4 card-shadow">
                <div class="flex items-start gap-3">
                    <button onclick="toggleTask('wound-check')" id="wound-check-btn" class="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5 btn-press"></button>
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-warm-800">伤口护理检查</span>
                            <span class="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">重要</span>
                        </div>
                        <p class="text-warm-500 text-sm mt-1">检查伤口敷料是否干燥、有无渗血</p>
                        <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>⏰ 每日早晚各一次</span>
                            <span>💡 如有异常立即联系医生</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl p-4 card-shadow">
                <div class="flex items-start gap-3">
                    <button onclick="toggleTask('medication')" id="medication-btn" class="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5 btn-press"></button>
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-warm-800">按时服药</span>
                            <span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">常规</span>
                        </div>
                        <p class="text-warm-500 text-sm mt-1">按医嘱服用止痛药和消炎药</p>
                        <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>⏰ 早8点、晚8点</span>
                            <span>💡 温水送服，不可空腹</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl p-4 card-shadow">
                <div class="flex items-start gap-3">
                    <button onclick="toggleTask('rehab-exercise')" id="rehab-exercise-btn" class="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5 btn-press"></button>
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-warm-800">康复训练</span>
                            <span class="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">常规</span>
                        </div>
                        <p class="text-warm-500 text-sm mt-1">进行简单的肢体活动和呼吸训练</p>
                        <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>⏰ 每日3次，每次15分钟</span>
                            <span>💡 动作轻柔，量力而行</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl p-4 card-shadow">
                <div class="flex items-start gap-3">
                    <button onclick="toggleTask('diet-manage')" id="diet-manage-btn" class="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5 btn-press"></button>
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-warm-800">饮食管理</span>
                            <span class="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">照护自己</span>
                        </div>
                        <p class="text-warm-500 text-sm mt-1">准备清淡易消化的流质或半流质食物</p>
                        <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>🥣 少食多餐，细嚼慢咽</span>
                            <span>💡 保证营养均衡</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl p-4 card-shadow">
                <div class="flex items-start gap-3">
                    <button onclick="toggleTask('daily-walk')" id="daily-walk-btn" class="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5 btn-press"></button>
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-warm-800">居家活动</span>
                            <span class="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">常规</span>
                        </div>
                        <p class="text-warm-500 text-sm mt-1">在室内缓慢行走，促进血液循环</p>
                        <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>🚶 每日2次，每次10分钟</span>
                            <span>💡 注意安全，防止跌倒</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function toggleNightMode() {
        isNightMode = !isNightMode;
        const body = document.body;
        const btn = document.getElementById('night-mode-btn');
        
        if (isNightMode) {
            body.classList.add('night-mode');
            btn.innerHTML = '<span class="material-icons text-yellow-500 text-sm">wb_sunny</span>';
        } else {
            body.classList.remove('night-mode');
            btn.innerHTML = '<span class="material-icons text-warm-600 text-sm">nightlight</span>';
        }
    }

    function quickRecord(type) {
        currentRecordType = type;
        const labels = {
            'pain': '疼痛评分 (0-10)',
            'urine': '排尿量 (ml)',
            'temp': '体温 (°C)',
            'bleeding': '出血情况',
            'fever': '体温 (°C)',
            'drain': '引流量 (ml)'
        };
        
        const defaults = {
            'pain': '5',
            'urine': '200',
            'temp': '36.5',
            'bleeding': '',
            'fever': '37.5',
            'drain': '100'
        };
        
        document.getElementById('record-title').textContent = {
            'pain': '疼痛记录',
            'urine': '排尿记录',
            'temp': '体温记录',
            'bleeding': '出血记录',
            'fever': '发热记录',
            'drain': '引流记录'
        }[type];
        document.getElementById('record-label').textContent = labels[type];
        document.getElementById('record-value').value = defaults[type];
        document.getElementById('record-note').value = '';
        document.getElementById('modal-record').style.display = 'flex';
    }

    function closeRecord() {
        document.getElementById('modal-record').style.display = 'none';
    }

    function saveRecord() {
        const value = document.getElementById('record-value').value;
        const note = document.getElementById('record-note').value;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        if (!validateRecord(value)) {
            UI.showToast('❌ 请输入有效数值');
            return;
        }
        
        const record = {
            type: currentRecordType,
            value: value,
            note: note,
            time: timeStr,
            date: now.toLocaleDateString('zh-CN')
        };
        
        const recordsKey = `careRecords_${currentScenario}`;
        let records = Storage.get(recordsKey, []);
        records.unshift(record);
        Storage.set(recordsKey, records);
        
        checkAlert(record, records);
        
        closeRecord();
        loadRecords();
        UI.showToast('✅ 记录已保存');
    }

    function checkAlert(record, allRecords) {
        const numValue = parseFloat(record.value);
        if (isNaN(numValue)) return;
        
        const todayRecords = allRecords.filter(r => r.date === record.date && r.type === record.type);
        
        let alertMsg = '';
        
        if (record.type === 'temp' || record.type === 'fever') {
            if (numValue > 38.5) {
                alertMsg = `您记录了体温：${numValue}°C。体温较高时，建议及时告知医护人员。`;
            } else if (todayRecords.length >= 3) {
                const recentRecords = todayRecords.slice(0, 3);
                const trendUp = recentRecords.every((r, i) => 
                    i === 0 || parseFloat(recentRecords[i-1].value) > parseFloat(r.value)
                );
                if (trendUp) {
                    alertMsg = `您记录的体温连续升高，建议关注变化并及时告知医护人员。`;
                }
            }
        } else if (record.type === 'pain') {
            if (numValue > 7) {
                alertMsg = `您记录了疼痛评分：${numValue}分。疼痛较明显时，建议及时告知医护人员。`;
            }
        } else if (record.type === 'urine') {
            if (numValue < 50) {
                alertMsg = `您记录了排尿量：${numValue}ml。排尿量较少时，建议及时告知医护人员。`;
            }
        }
        
        if (alertMsg) {
            showAlertModal(alertMsg);
        }
    }

    function showAlertModal(message) {
        const modalId = 'alert-modal-' + Date.now();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white w-[90%] max-w-sm rounded-2xl p-6 animate-slide-up">
                <div class="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="text-amber-600 text-2xl">💡</span>
                </div>
                <h3 class="text-lg font-bold text-warm-800 mb-2 text-center">照护提醒</h3>
                <p class="text-warm-600 text-sm mb-4 leading-relaxed">${message}</p>
                <div class="bg-amber-50 rounded-xl p-3 mb-4">
                    <p class="text-amber-700 text-xs text-center">⚠️ 以上建议仅供参考，请以医护人员意见为准</p>
                </div>
                <button onclick="document.getElementById('${modalId}').remove()" class="w-full bg-primary text-white rounded-xl py-3 font-semibold btn-press">我知道了</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function validateRecord(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
    }

    function loadRecords() {
        const recordsKey = `careRecords_${currentScenario}`;
        const records = Storage.get(recordsKey, []);
        const today = new Date().toLocaleDateString('zh-CN');
        const todayRecords = records.filter(r => r.date === today);
        
        const displayEl = document.getElementById('records-display');
        const listEl = document.getElementById('records-list');
        
        if (todayRecords.length > 0) {
            displayEl.classList.remove('hidden');
            listEl.innerHTML = todayRecords.map(r => {
                const icons = { pain: '😣', urine: '💧', temp: '🌡️', bleeding: '🩸', fever: '🌡️', drain: '💧' };
                const types = { pain: '疼痛', urine: '排尿', temp: '体温', bleeding: '出血', fever: '发热', drain: '引流' };
                const colors = { 
                    pain: 'bg-red-50 text-red-600', 
                    urine: 'bg-blue-50 text-blue-600', 
                    temp: 'bg-green-50 text-green-600',
                    bleeding: 'bg-red-50 text-red-600',
                    fever: 'bg-orange-50 text-orange-600',
                    drain: 'bg-blue-50 text-blue-600'
                };
                return `
                    <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div class="flex items-center gap-2">
                            <span class="${colors[r.type]} rounded-full w-8 h-8 flex items-center justify-center text-sm">${icons[r.type]}</span>
                            <div>
                                <div class="text-sm font-medium text-gray-700">${types[r.type]} ${r.value}</div>
                                ${r.note ? `<div class="text-xs text-gray-400">${r.note}</div>` : ''}
                            </div>
                        </div>
                        <span class="text-xs text-gray-400">${r.time}</span>
                    </div>
                `;
            }).join('');
        } else {
            displayEl.classList.add('hidden');
        }
    }

    const roadmapData = {
        '骨科': {
            'day1': {
                todayFocus: ['确认患肢体位、能否翻身下床负重', '观察患肢疼痛肿胀皮肤颜色', '保护伤口引流管支具'],
                todo: ['记录疼痛评分和用药后变化', '按医嘱协助踝泵深呼吸', '保护管路避免牵拉', '观察患肢脚趾/手指活动'],
                specialNotes: ['负重限制必须以医生交代为准', '髋关节脊柱骨折体位限制差异大', '不自行判断能否活动'],
                emergency: ['患肢突然剧痛、明显肿胀', '患肢发凉发白发紫', '麻木加重无法活动'],
                checkInQuestions: ['今天能不能翻身下床？', '患肢可以负重吗？', '哪些情况要马上叫护士？'],
                recommendedTraining: ['turn-body', 'pressure', 'oxygen']
            },
            'day2-3': {
                todayFocus: ['按康复师要求做床上活动、坐起、站立或助行器短距离移动', '活动前确认止痛和助行器', '观察活动后疼痛肿胀变化'],
                todo: ['记录活动前后疼痛评分', '按医嘱做康复训练', '检查管路位置和敷料', '继续防压疮防跌倒'],
                specialNotes: ['不能自行取消助行器支具', '不强拉关节不做大幅被动活动', '小腿明显肿痛及时联系医护'],
                emergency: ['小腿明显肿痛、一侧腿更红更热', '胸痛或气短', '伤口渗血增多'],
                checkInQuestions: ['今天活动目标是什么？', '饮食到哪一步？', '是否能拔管换药？'],
                recommendedTraining: ['turn-body', 'ambulation', 'wound-dressing']
            },
            'day4-7': {
                todayFocus: ['建立每日活动计划', '观察伤口和患肢肿胀', '训练安全转移', '准备出院防跌倒布置'],
                todo: ['记录行走距离和疼痛', '按医嘱提醒用药', '训练安全转移', '准备复诊和换药安排'],
                specialNotes: ['关节置换患者遵守特殊姿势限制', '骨折患者负重进阶由医生决定', '疼痛变轻后不忽视限制'],
                emergency: ['伤口红肿热痛渗液增多', '发热、疼痛突然变重', '跌倒或险些跌倒'],
                checkInQuestions: ['出院后能做什么不能做什么？', '什么时候复诊？', '什么情况直接回医院？'],
                recommendedTraining: ['ambulation', 'bath', 'pressure']
            },
            'day7+': {
                todayFocus: ['居家康复动作打卡', '记录行走距离疼痛肿胀', '继续居家防跌倒'],
                todo: ['按康复师方案执行训练', '记录跌倒或险些跌倒', '准备复诊资料', '鼓励患者安全范围内自理'],
                specialNotes: ['居家内容只承接医护训练方案', '不输出康复处方', '跌倒、伤口异常及时就医'],
                emergency: ['跌倒或伤口异常', '疼痛突然加重', '患肢异常肿痛或麻木'],
                checkInQuestions: ['康复进度如何？', '需要调整训练强度吗？', '下次复诊时间？'],
                recommendedTraining: ['ambulation', 'pressure']
            }
        },
        '腹部': {
            'day1': {
                todayFocus: ['确认禁食/饮水/流食阶段', '保护腹部伤口和引流管', '记录恶心呕吐腹胀排气'],
                todo: ['记录疼痛位置和强度', '按医护要求协助深呼吸', '咳嗽时保护切口', '观察引流液颜色量'],
                specialNotes: ['饮食推进必须听医生护士安排', '不自行使用通便药止泻药', '不按摩切口周围'],
                emergency: ['持续呕吐、腹痛加重', '腹胀明显、发热', '伤口渗液或出血'],
                checkInQuestions: ['今天饮食目标是什么？', '什么时候能下床？', '排气排便目标？'],
                recommendedTraining: ['wound-dressing', 'oxygen', 'pressure']
            },
            'day2-3': {
                todayFocus: ['按医嘱推进饮食并记录耐受', '鼓励早期下床活动', '观察引流液变化'],
                todo: ['记录排气排便腹胀', '按医嘱进食饮水', '咳嗽时用枕头保护腹部', '记录进食量和恶心情况'],
                specialNotes: ['排气排便是重要观察项但不单独判断恢复', '不热敷伤口不自行换深层敷料', '引流突然增多及时找医护'],
                emergency: ['引流突然增多变浑浊', '发热、切口红肿', '持续呕吐腹痛'],
                checkInQuestions: ['今天能吃什么？', '活动目标是什么？', '能否拔管？'],
                recommendedTraining: ['turn-body', 'ambulation', 'pressure']
            },
            'day4-7': {
                todayFocus: ['建立饮食记录', '活动从短距离多次开始', '准备出院饮食禁忌'],
                todo: ['记录吃了什么和排便情况', '观察头晕气短切口牵拉痛', '按医嘱预防便秘', '确认复诊时间'],
                specialNotes: ['少量多餐循序渐进', '亲友进补建议与医院要求冲突时听医嘱', '腹痛加重及时联系'],
                emergency: ['腹痛越来越重', '停止排气排便伴腹胀', '反复呕吐黑便血便'],
                checkInQuestions: ['出院后饮食禁忌？', '回家后怎么洗澡？', '什么情况要回医院？'],
                recommendedTraining: ['wound-dressing', 'pressure', 'bath']
            },
            'day7+': {
                todayFocus: ['按出院单执行饮食药物换药', '持续记录食欲排便伤口', '居家防跌倒'],
                todo: ['记录体重趋势和腹痛', '逐步恢复日常活动', '避免提重物牵拉腹部', '准备复诊问题'],
                specialNotes: ['肠胃肝胆造口肿瘤术后差异大', '不输出细分饮食方案', '发热伤口异常及时就医'],
                emergency: ['发热、伤口异常', '腹痛加重、持续呕吐', '黄疸加重、出血'],
                checkInQuestions: ['恢复情况如何？', '需要调整饮食吗？', '下次复诊时间？'],
                recommendedTraining: ['wound-dressing', 'pressure']
            }
        },
        '心脏': {
            'day1': {
                todayFocus: ['记录胸闷胸痛呼吸心率血压', '保护伤口引流管氧疗设备', '按医护要求协助活动'],
                todo: ['记录疼痛区分切口疼和胸闷', '观察血氧意识状态', '按医嘱提醒用药', '记录活动后不适'],
                specialNotes: ['本模板为通用提醒', '心脏术后风险高请以心内科医嘱为准', '不自行调氧或处理管路'],
                emergency: ['胸痛胸闷气短出冷汗', '晕厥、心跳明显异常', '意识改变'],
                checkInQuestions: ['今天能不能坐起下床？', '氧流量多少？', '哪些情况要立即叫医护？'],
                recommendedTraining: ['oxygen', 'pressure']
            },
            'day2-3': {
                todayFocus: ['在医护允许下做床边活动', '记录活动前后胸闷气短', '观察伤口或穿刺点'],
                todo: ['记录心慌疲劳程度', '按医嘱提醒用药', '记录漏服风险', '观察出血异常'],
                specialNotes: ['活动强度由医生康复团队决定', '不提供心率目标或运动处方', '穿刺点出血及时联系'],
                emergency: ['胸痛气短、心慌明显', '伤口或穿刺点出血', '黑便血尿'],
                checkInQuestions: ['活动强度边界是什么？', '出院后心脏康复安排？', '用药注意事项？'],
                recommendedTraining: ['oxygen', 'pressure']
            },
            'day4-7': {
                todayFocus: ['建立低强度活动记录', '整理药物清单复诊时间', '记录睡眠焦虑情绪'],
                todo: ['记录走了几次每次多久', '记录伤口体温', '准备心脏康复转介', '记录情绪波动'],
                specialNotes: ['不提供统一心率目标', '不做停药建议', '胸痛呼吸困难及时就医'],
                emergency: ['胸痛、呼吸困难', '明显心悸、晕厥', '伤口感染或出血'],
                checkInQuestions: ['出院后能做什么不能做什么？', '心脏康复怎么安排？', '复诊时间？'],
                recommendedTraining: ['pressure']
            },
            'day7+': {
                todayFocus: ['按医嘱完成药物复诊康复', '记录活动耐受胸闷气短', '建立药物提醒'],
                todo: ['记录体重水肿变化', '按康复方案执行', '准备复诊问题', '支持情绪恢复'],
                specialNotes: ['请以心内科心外科心脏康复团队医嘱为准', '不输出运动强度推荐', '胸痛胸闷及时就医'],
                emergency: ['胸痛胸闷气短', '心跳明显异常', '意识改变'],
                checkInQuestions: ['康复进度如何？', '需要调整用药吗？', '下次复诊时间？'],
                recommendedTraining: ['pressure']
            }
        },
        '脑部': {
            'day1': {
                todayFocus: ['记录意识清醒程度肢体活动', '保护头部伤口和引流管路', '保持环境安静减少刺激'],
                todo: ['记录头痛呕吐抽搐', '协助安全翻身防跌倒', '记录恶心呕吐', '保持头位按医护要求'],
                specialNotes: ['本模板为通用提醒', '脑部术后异常识别要求高', '不教家属做专业神经查体'],
                emergency: ['突发意识变差、抽搐', '剧烈头痛喷射性呕吐', '瞳孔明显不等大'],
                checkInQuestions: ['头位角度多少？', '能否进食下床？', '哪些神经症状要立刻叫人？'],
                recommendedTraining: ['pressure', 'bath']
            },
            'day2-3': {
                todayFocus: ['记录清醒程度语言肢体', '首次下床必须有人陪', '观察头痛呕吐发热'],
                todo: ['记录吞咽进食安全', '观察伤口渗液抽搐', '记录烦躁幻觉情绪变化', '防跌倒'],
                specialNotes: ['不自行喂水喂饭给吞咽不安全患者', '不自行停用抗癫痫药物', '抽搐意识变化立即求助'],
                emergency: ['抽搐、意识变化', '头痛呕吐加重', '肢体无力或说话不清'],
                checkInQuestions: ['是否需要康复评估？', '能否进食？', '抗癫痫药物怎么吃？'],
                recommendedTraining: ['pressure', 'bath']
            },
            'day4-7': {
                todayFocus: ['建立神经变化观察表', '按康复师建议安全活动', '准备出院安全'],
                todo: ['记录清醒说话肢体走路', '观察伤口和发热', '准备防跌倒陪护', '整理复诊资料'],
                specialNotes: ['不输出脑功能恢复训练处方', '只承接康复师方案', '神经症状变化及时就医'],
                emergency: ['神经症状变化、抽搐', '伤口渗液、发热', '明显头痛呕吐'],
                checkInQuestions: ['出院后能独处吗？', '能开车工作吗？', '复诊项目有哪些？'],
                recommendedTraining: ['pressure']
            },
            'day7+': {
                todayFocus: ['按出院医嘱完成服药复诊', '每日记录意识语言肢体', '居家防跌倒防走失'],
                todo: ['记录走路头痛呕吐抽搐', '准备复诊问题', '记录异常视频或文字', '支持情绪认知变化'],
                specialNotes: ['出现抽搐意识改变按急症处理', '只做观察和沟通不做疾病判断', '及时寻求医护或心理支持'],
                emergency: ['抽搐、意识改变', '突发肢体或语言问题', '剧烈头痛呕吐'],
                checkInQuestions: ['恢复情况如何？', '需要调整治疗方案吗？', '下次复诊时间？'],
                recommendedTraining: ['pressure']
            }
        }
    };

    const trainingData = {
        'turn-body': {
            title: '术后翻身',
            icon: '🔄',
            category: '基础护理',
            purpose: '预防压疮，促进排痰，保持舒适',
            items: ['枕头2-3个', '洗手液'],
            steps: [
                { num: 1, title: '先告知', desc: '先告诉患者："我要帮你翻个身，哪里痛你马上说。"', icon: '💬', image: 'images/turn-body/step1.png' },
                { num: 2, title: '调床高', desc: '把床调到自己不弯腰太多的高度，确认床边安全。', icon: '🛏️', image: 'images/turn-body/step2.png' },
                { num: 3, title: '靠近侧', desc: '让患者靠近你这一侧，能配合就让他自己弯腿、看向要翻的方向。', icon: '🧑‍🦽', image: 'images/turn-body/step3.png' },
                { num: 4, title: '摆姿势', desc: '把患者上面的手放在胸前，两只脚稍微错开，避免压住手脚。', icon: '🤲', image: 'images/turn-body/step4.png' },
                { num: 5, title: '扶肩髋', desc: '一手扶肩，一手扶髋，身体靠近患者，慢慢把人翻向自己。', icon: '🤝', image: 'images/turn-body/step5.png' },
                { num: 6, title: '垫枕头', desc: '翻好后用枕头垫住背后、两膝之间或脚踝处，让患者舒服。', icon: '🛌', image: 'images/turn-body/step6.png' },
                { num: 7, title: '查皮肤', desc: '看一眼肩、背、臀、脚跟有没有发红、压痕、破皮。', icon: '👀', image: 'images/turn-body/step7.png' }
            ],
            risks: '⚠️ 翻身时疼痛明显、头晕、出汗、脸色变差，先停下叫护士。\n⚠️ 皮肤发红不退、破皮、渗液，联系医护。\n⚠️ 有脊柱、髋关节、骨折、特殊手术限制者，不按通用步骤翻身，先问医护。',
            commonErrors: ['用力过猛导致老人不适', '忘记保护引流管', '翻身频率不够', '垫枕不到位导致身体悬空'],
            quiz: [
                { question: '翻身前应该先做什么？', options: ['直接开始翻', '先告知患者并确认疼痛情况'], correct: 1 },
                { question: '调床高度的目的是什么？', options: ['方便操作', '让患者舒服'], correct: 0 },
                { question: '患者靠近哪一侧？', options: ['靠近护士侧', '靠近照护者自己这一侧'], correct: 1 },
                { question: '患者上面的手应该放在哪里？', options: ['放在身体两侧', '放在胸前'], correct: 1 },
                { question: '翻身时应该扶患者的哪些部位？', options: ['扶头和脚', '扶肩和髋'], correct: 1 },
                { question: '翻身后需要用枕头垫哪些部位？', options: ['只垫背后', '背后、两膝之间或脚踝处'], correct: 1 },
                { question: '翻身最后一步要检查什么？', options: ['患者表情', '皮肤是否有发红、压痕、破皮'], correct: 1 }
            ]
        },
        'pressure': {
            title: '压疮预防护理',
            icon: '🛡️',
            category: '基础护理',
            purpose: '预防压疮，保护皮肤健康',
            items: ['枕头或软垫', '干净毛巾', '护理液', '记录笔'],
            steps: [
                { num: 1, title: '换压', desc: '不要让同一个地方一直被压着，定时翻身。', icon: '🔄', image: 'images/pressure/step1.png' },
                { num: 2, title: '换姿', desc: '按医护要求帮患者换姿势，仰卧、左侧卧、右侧卧轮换。', icon: '🧘', image: 'images/pressure/step2.png' },
                { num: 3, title: '看压点', desc: '每次换姿势时，看脚跟、臀部、尾骨、髋部、肩背、后脑勺。', icon: '👀', image: 'images/pressure/step3.png' },
                { num: 4, title: '垫软', desc: '用枕头或软垫把骨头突出的地方垫舒服，脚跟不要一直顶在床上。', icon: '🛌', image: 'images/pressure/step4.png' },
                { num: 5, title: '擦干', desc: '皮肤出汗、尿湿、弄脏后，尽快清洁并擦干。', icon: '🧴', image: 'images/pressure/step5.png' },
                { num: 6, title: '理平', desc: '床单、衣服保持平整，别让皱褶、硬物、管子压在身下。', icon: '🧹', image: 'images/pressure/step6.png' },
                { num: 7, title: '反馈', desc: '发现吃得少、喝得少、皮肤越来越差，告诉医护。', icon: '📞', image: 'images/pressure/step7.png' }
            ],
            risks: '⚠️ 皮肤红了、紫了、发热、发硬、疼，换姿势后还不退，要告诉医护。\n⚠️ 破皮、起水泡、渗液、臭味、发热，马上联系医护。\n⚠️ 不要用力揉发红部位，不要自己处理深伤口。',
            commonErrors: ['忽视早期发红信号', '用力按摩发红部位', '忘记记录观察结果', '床单位不平整'],
            quiz: [
                { question: '压疮预防的核心原则是什么？', options: ['保持皮肤湿润', '不要让同一个地方一直被压着'], correct: 1 },
                { question: '常见的翻身姿势有哪些？', options: ['只有仰卧', '仰卧、左侧卧、右侧卧轮换'], correct: 1 },
                { question: '需要重点观察哪些部位？', options: ['只有脸部', '脚跟、臀部、尾骨、髋部、肩背、后脑勺'], correct: 1 },
                { question: '骨头突出的地方应该怎么处理？', options: ['用力按压', '用枕头或软垫垫舒服'], correct: 1 },
                { question: '皮肤出汗或尿湿后应该怎么做？', options: ['等干了再说', '尽快清洁并擦干'], correct: 1 },
                { question: '床单应该保持什么状态？', options: ['随意摆放', '保持平整，没有皱褶和硬物'], correct: 1 },
                { question: '发现皮肤发红不退应该怎么做？', options: ['继续观察', '告诉医护人员'], correct: 1 }
            ]
        },
        'drainage': {
            title: '引流管护理观察',
            icon: '💧',
            category: '基础护理',
            purpose: '学会观察和保护引流管，及时发现异常',
            items: ['洗手液', '记录笔', '引流袋', '固定带'],
            steps: [
                { num: 1, title: '先问', desc: '先确认护士有没有说：家属能不能碰、能不能排空、怎么记录。', icon: '❓', image: 'images/drainage/step1.png' },
                { num: 2, title: '洗手', desc: '每次看管子前先洗手。', icon: '🧼', image: 'images/drainage/step2.png' },
                { num: 3, title: '查管路', desc: '看管子有没有被压住、折住、拉住，球囊有没有固定好。', icon: '🔍', image: 'images/drainage/step3.png' },
                { num: 4, title: '看颜色量', desc: '看引流液颜色、多少、有没有突然变浑浊或有臭味。', icon: '👀', image: 'images/drainage/step4.png' },
                { num: 5, title: '记录', desc: '如果医护允许排空，就按教过的方法做，并记录时间、量、颜色。', icon: '📝', image: 'images/drainage/step5.png' },
                { num: 6, title: '看管口', desc: '看管口周围皮肤有没有更红、更肿、更痛、渗液或异味。', icon: '🩹', image: 'images/drainage/step6.png' },
                { num: 7, title: '放安全', desc: '记录后把管子和球囊放回安全位置，避免被衣服、被子、身体拉扯。', icon: '🛡️', image: 'images/drainage/step7.png' }
            ],
            risks: '⚠️ 管子掉出来、固定线松了、球囊不工作、引流突然停止或突然增多，叫医护。\n⚠️ 发热、管口明显红肿痛、流出脓样或臭味液体，叫医护。\n⚠️ 不要自行通管、挤管、冲洗、拔管。',
            commonErrors: ['忘记洗手就碰管子', '用力挤压引流球', '引流袋位置高于伤口', '没有及时记录'],
            quiz: [
                { question: '看管子前应该先做什么？', options: ['直接看', '先洗手'], correct: 1 },
                { question: '检查管路时要注意什么？', options: ['随便放就行', '看有没有被压住、折住、拉住'], correct: 1 },
                { question: '引流液出现什么情况需要报告？', options: ['颜色正常', '突然变浑浊或有臭味'], correct: 1 },
                { question: '记录时需要记哪些内容？', options: ['只记时间', '时间、量、颜色'], correct: 1 },
                { question: '管口周围皮肤出现什么要报告？', options: ['正常颜色', '更红、更肿、更痛、渗液或异味'], correct: 1 },
                { question: '引流袋应该怎么放？', options: ['放高处', '放安全位置，避免拉扯'], correct: 1 },
                { question: '发现引流突然停止应该怎么做？', options: ['自己检查', '立即叫医护'], correct: 1 }
            ]
        },
        'pain': {
            title: '术后疼痛评估与护理干预',
            icon: '😣',
            category: '基础护理',
            purpose: '学会评估疼痛并正确处理',
            items: ['疼痛评分表', '记录笔', '医嘱单', '止痛药'],
            steps: [
                { num: 1, title: '问疼痛', desc: '问患者："现在痛不痛？0到10分，你觉得几分？"', icon: '❓', image: 'images/pain/step1.png' },
                { num: 2, title: '指位置', desc: '让患者指出哪里痛，是刀口痛、肚子痛、背痛，还是其他地方痛。', icon: '👆', image: 'images/pain/step2.png' },
                { num: 3, title: '记录', desc: '记录疼痛分数、时间、位置、做什么会更痛。', icon: '📝', image: 'images/pain/step3.png' },
                { num: 4, title: '看影响', desc: '看疼痛有没有影响翻身、下床、睡觉、深呼吸。', icon: '👀', image: 'images/pain/step4.png' },
                { num: 5, title: '按医嘱', desc: '按医嘱提醒用药，不自己加药、停药、换药。', icon: '💊', image: 'images/pain/step5.png' },
                { num: 6, title: '复评', desc: '用药后过一会儿再问一次：有没有缓解，降到几分。', icon: '⏰', image: 'images/pain/step6.png' },
                { num: 7, title: '反馈', desc: '疼得不能活动或药后没缓解，告诉护士或医生。', icon: '📞', image: 'images/pain/step7.png' }
            ],
            risks: '⚠️ 疼痛突然明显加重、伴出血、胸闷、呼吸困难、意识不清，马上叫医护。\n⚠️ 吃药后特别困、叫不醒、呼吸变慢，马上叫医护。\n⚠️ 不要劝患者硬忍，也不要自行加止痛药。',
            commonErrors: ['让患者硬忍疼痛', '自行加药或停药', '忘记记录疼痛情况', '不评估用药效果'],
            quiz: [
                { question: '疼痛评分通常用什么范围？', options: ['1到5分', '0到10分'], correct: 1 },
                { question: '除了评分，还需要了解什么？', options: ['只需要分数', '哪里痛、什么情况下更痛'], correct: 1 },
                { question: '疼痛会影响哪些方面？', options: ['没有影响', '翻身、下床、睡觉、深呼吸'], correct: 1 },
                { question: '止痛药应该怎么用？', options: ['自己决定', '按医嘱使用'], correct: 1 },
                { question: '用药后应该做什么？', options: ['不管了', '过一会儿再评估效果'], correct: 1 },
                { question: '疼痛没缓解应该怎么做？', options: ['继续观察', '告诉护士或医生'], correct: 1 },
                { question: '患者吃药后特别困、叫不醒应该怎么做？', options: ['让他睡', '马上叫医护'], correct: 1 }
            ]
        },
        'ambulation': {
            title: '术后早期下床活动指引',
            icon: '🚶',
            category: '康复护理',
            purpose: '安全协助患者术后第一次下床活动',
            items: ['助行器', '防滑鞋', '椅子', '呼叫铃'],
            steps: [
                { num: 1, title: '先确认', desc: '先确认护士或医生说"可以下床"。', icon: '✅', image: 'images/ambulation/step1.png' },
                { num: 2, title: '有人陪', desc: '第一次下床一定有人在旁边，别让患者自己逞强。', icon: '🤝', image: 'images/ambulation/step2.png' },
                { num: 3, title: '先侧身', desc: '先让患者侧身，做好下床准备。', icon: '🔄', image: 'images/ambulation/step3.png' },
                { num: 4, title: '腿下床', desc: '慢慢把双腿放到床边。', icon: '🦵', image: 'images/ambulation/step4.png' },
                { num: 5, title: '坐稳', desc: '用手臂撑起上半身，坐在床边停一会儿。', icon: '🪑', image: 'images/ambulation/step5.png' },
                { num: 6, title: '慢走', desc: '不头晕、不腿软，再扶稳站起来，站住后先停几秒，再短距离走动。', icon: '🚶', image: 'images/ambulation/step6.png' },
                { num: 7, title: '马上停', desc: '头晕、痛、腿软，马上坐回去并叫护士。', icon: '🛑', image: 'images/ambulation/step7.png' }
            ],
            risks: '⚠️ 头晕、胸闷、气短、脸色苍白、出冷汗，马上停。\n⚠️ 管路很多时，先让护士整理管路再下床。\n⚠️ 不要未获允许就下床，不要第一次就走远。',
            commonErrors: ['患者自己逞强下床', '没站稳就急着走', '第一次下床走太远', '忽略头晕等不适症状'],
            quiz: [
                { question: '术后下床前应该先做什么？', options: ['直接下床', '确认医生或护士同意'], correct: 1 },
                { question: '第一次下床需要有人陪同吗？', options: ['不需要', '必须有人陪'], correct: 1 },
                { question: '下床时应该先做什么动作？', options: ['直接站起来', '先侧身把腿放到床边'], correct: 1 },
                { question: '坐在床边后应该怎么做？', options: ['马上站起来', '停一会儿确认不头晕'], correct: 1 },
                { question: '第一次下床应该走多远？', options: ['走得越远越好', '短距离慢慢走'], correct: 1 },
                { question: '下床时出现头晕应该怎么做？', options: ['继续走', '马上坐下并叫护士'], correct: 1 },
                { question: '管路很多时应该怎么做？', options: ['自己整理管路', '先让护士整理管路'], correct: 1 }
            ]
        },
        'wound-dressing': {
            title: '伤口换药护理',
            icon: '🩹',
            category: '基础护理',
            purpose: '安全更换伤口外层敷料',
            items: ['新敷料', '胶布', '垃圾袋', '洗手液'],
            steps: [
                { num: 1, title: '先确认', desc: '先确认医生或护士说过：家属可以换外层敷料。', icon: '✅', image: 'images/wound-dressing/step1.png' },
                { num: 2, title: '洗手备物', desc: '换之前洗手，准备干净台面和新敷料。', icon: '🧼', image: 'images/wound-dressing/step2.png' },
                { num: 3, title: '轻取', desc: '轻轻撕开胶布，慢慢取下旧敷料，不要硬扯伤口。', icon: '🗑️', image: 'images/wound-dressing/step3.png' },
                { num: 4, title: '观察', desc: '看伤口周围有没有更红、更肿、更痛、出血、裂开、臭味或黄绿色渗液。', icon: '👀', image: 'images/wound-dressing/step4.png' },
                { num: 5, title: '勿碰内侧', desc: '不碰新敷料贴伤口的那一面。', icon: '❌', image: 'images/wound-dressing/step5.png' },
                { num: 6, title: '覆盖固定', desc: '把新敷料盖好并固定。', icon: '🔒', image: 'images/wound-dressing/step6.png' },
                { num: 7, title: '丢弃记录', desc: '旧敷料和垃圾装袋丢掉，换完再洗手，并记录看到的异常。', icon: '📝', image: 'images/wound-dressing/step7.png' }
            ],
            risks: '⚠️ 发热、出血多、伤口裂开、渗液变多变臭、红肿痛加重，联系医护。\n⚠️ 不要自己拆线、拔钉、撕皮肤胶。\n⚠️ 不要自行涂药膏、药粉、酒精、碘伏，除非医生明确要求。',
            commonErrors: ['没确认就自行换药', '用手触碰敷料内侧', '硬扯敷料导致伤口疼痛', '不观察伤口直接换', '忘记记录异常情况'],
            quiz: [
                { question: '换药前应该先做什么？', options: ['直接换', '确认医生或护士同意'], correct: 1 },
                { question: '可以用手触碰新敷料贴伤口的一面吗？', options: ['可以', '不可以'], correct: 1 },
                { question: '取下旧敷料时应该怎么做？', options: ['硬扯', '轻轻撕开'], correct: 1 },
                { question: '换敷料时需要观察伤口吗？', options: ['不需要', '需要观察有没有异常'], correct: 1 },
                { question: '伤口出现臭味应该怎么做？', options: ['继续观察', '立即联系医护'], correct: 1 },
                { question: '可以自己拆线吗？', options: ['可以', '不可以'], correct: 1 },
                { question: '换完敷料后应该做什么？', options: ['直接离开', '洗手并记录'], correct: 1 }
            ]
        },
        'bath': {
            title: '床上擦浴',
            icon: '🛁',
            category: '基础护理',
            purpose: '保持身体清洁，促进血液循环',
            items: ['温水', '毛巾2条', '沐浴露', '换洗衣物', '润肤霜'],
            steps: [
                { num: 1, title: '先告知', desc: '先关门窗、调好室温，告诉患者要擦身了。', icon: '🌡️', image: 'images/bath/step1.png' },
                { num: 2, title: '备用品', desc: '准备温水、毛巾、清洁用品、干毛巾、干净衣物。', icon: '🧴', image: 'images/bath/step2.png' },
                { num: 3, title: '盖好', desc: '只露出正在擦的地方，其他地方盖好，保护隐私和保暖。', icon: '🛌', image: 'images/bath/step3.png' },
                { num: 4, title: '轻擦', desc: '先擦脸，再擦上身、手臂、腹部、腿脚，动作要轻。', icon: '🧼', image: 'images/bath/step4.png' },
                { num: 5, title: '擦背', desc: '帮患者侧身，轻轻擦背和臀部。', icon: '🔄', image: 'images/bath/step5.png' },
                { num: 6, title: '擦干', desc: '洗过的地方要擦干，皮肤褶皱也要擦干。', icon: '💧', image: 'images/bath/step6.png' },
                { num: 7, title: '查皮肤', desc: '顺便看皮肤有没有红、破、痛、潮湿、压痕。', icon: '👀', image: 'images/bath/step7.png' }
            ],
            risks: '⚠️ 水不要太烫，不要用力搓。\n⚠️ 患者痛、冷、头晕、喘不过气，要先停。\n⚠️ 看到红肿、破皮、渗液、压疮风险，告诉医护。',
            commonErrors: ['水温过高或过低', '用力搓擦皮肤', '忽略保暖', '不保护隐私', '皮肤褶皱没擦干', '不观察皮肤状态'],
            quiz: [
                { question: '擦浴前应该先做什么？', options: ['直接开始擦', '关门窗、调室温、告知患者'], correct: 1 },
                { question: '需要准备哪些物品？', options: ['只要水', '温水、毛巾、清洁用品、干毛巾、干净衣物'], correct: 1 },
                { question: '擦浴时应该怎么保护患者？', options: ['全脱光擦', '只露出正在擦的地方，其他地方盖好'], correct: 1 },
                { question: '擦浴应该从哪个部位开始？', options: ['脚', '脸'], correct: 1 },
                { question: '擦背时应该怎么做？', options: ['让患者躺着擦', '帮患者侧身再擦'], correct: 1 },
                { question: '皮肤褶皱处需要擦干吗？', options: ['不需要', '需要，皮肤褶皱也要擦干'], correct: 1 },
                { question: '擦浴时应该观察什么？', options: ['不用观察', '皮肤有没有红、破、痛、潮湿、压痕'], correct: 1 }
            ]
        },
        'oxygen': {
            title: '吸氧护理',
            icon: '💨',
            category: '急救护理',
            purpose: '正确使用吸氧设备，确保安全有效',
            items: ['吸氧管', '湿化瓶', '流量表', '备用鼻导管'],
            steps: [
                { num: 1, title: '先看医嘱', desc: '先看医嘱或护士交代：用哪种氧气、流量是多少、什么时候用。', icon: '📋', image: 'images/oxygen/step1.png' },
                { num: 2, title: '戴好鼻导管', desc: '帮患者戴好鼻导管，两个小头轻轻放进鼻孔，管子绕过耳朵固定好。', icon: '👃', image: 'images/oxygen/step2.png' },
                { num: 3, title: '查管路', desc: '看管子有没有折住、压住、脱落，确保管路通畅。', icon: '🔍', image: 'images/oxygen/step3.png' },
                { num: 4, title: '勿调流量', desc: '不要自己调氧流量，不要自己停氧，一切按医嘱来。', icon: '🚫', image: 'images/oxygen/step4.png' },
                { num: 5, title: '远离火源', desc: '氧气远离烟、火、燃气灶、取暖器，保持安全距离。', icon: '🔥', image: 'images/oxygen/step5.png' },
                { num: 6, title: '口鼻干燥', desc: '口鼻干燥时，问医护能不能用水性润滑产品。', icon: '💧', image: 'images/oxygen/step6.png' },
                { num: 7, title: '及时求助', desc: '患者不舒服时，先看管路和氧气是否正常，再联系医护。', icon: '📞', image: 'images/oxygen/step7.png' }
            ],
            risks: '⚠️ 嘴唇或指甲发蓝、呼吸费力、意识变迷糊、很困叫不醒，马上求助。\n⚠️ 头痛明显、呼吸变慢变浅、胸闷气短，联系医护。\n⚠️ 使用氧气时严禁吸烟，氧气旁不要有明火。',
            commonErrors: ['自己调氧流量', '自己停氧', '吸氧管折住或压住', '氧气附近吸烟或有明火', '口鼻干燥不咨询医护自行处理'],
            quiz: [
                { question: '吸氧前应该先做什么？', options: ['直接戴鼻导管', '先看医嘱或护士交代'], correct: 1 },
                { question: '鼻导管应该怎么戴？', options: ['用力塞进鼻孔', '两个小头轻轻放进鼻孔'], correct: 1 },
                { question: '检查管路时要注意什么？', options: ['不用管', '看管子有没有折住、压住、脱落'], correct: 1 },
                { question: '可以自己调节氧流量吗？', options: ['可以', '不可以，要按医嘱'], correct: 1 },
                { question: '氧气应该远离什么？', options: ['什么都不用远离', '烟、火、燃气灶、取暖器'], correct: 1 },
                { question: '口鼻干燥时应该怎么做？', options: ['自己随便涂东西', '问医护能不能用水性润滑产品'], correct: 1 },
                { question: '患者不舒服时应该怎么做？', options: ['继续观察', '先看管路和氧气是否正常，再联系医护'], correct: 1 }
            ]
        }
    };

    let microTrainingIndex = 0;
    const microTrainingQuestions = [
        { question: '翻身拍背应该每几小时一次？', options: ['每4小时', '每2小时'], correct: 1 },
        { question: '喂食时老人应该采取什么姿势？', options: ['平躺', '坐直或半卧位'], correct: 1 },
        { question: '发现皮肤发红按压不褪色时，应该怎么做？', options: ['继续观察', '立即报告护士'], correct: 1 },
        { question: '擦拭清洁会阴部时应该从哪个方向擦？', options: ['从前向后', '从后向前'], correct: 0 },
        { question: '消毒伤口时应该从哪个方向擦？', options: ['从外向内', '从内向外'], correct: 1 },
        { question: '康复训练感到剧烈疼痛时应该怎么做？', options: ['继续坚持', '立即停止'], correct: 1 },
        { question: '吸氧时可以吸烟吗？', options: ['可以', '不可以'], correct: 1 },
        { question: '擦浴时应该先擦哪个部位？', options: ['脚', '面部'], correct: 1 }
    ];

    function showMicroTraining() {
        microTrainingIndex = 0;
        document.getElementById('modal-micro-training').style.display = 'flex';
        renderMicroTrainingQuestion();
    }

    function closeMicroTraining() {
        document.getElementById('modal-micro-training').style.display = 'none';
    }

    function renderMicroTrainingQuestion() {
        const question = microTrainingQuestions[microTrainingIndex];
        const progress = ((microTrainingIndex + 1) / microTrainingQuestions.length) * 100;
        
        document.getElementById('training-progress').textContent = `第 ${microTrainingIndex + 1} 题 / 共 ${microTrainingQuestions.length} 题`;
        document.getElementById('training-progress-bar').style.width = `${progress}%`;
        
        const content = document.getElementById('training-content');
        content.innerHTML = `
            <div class="py-4">
                <h3 class="text-lg font-bold text-warm-800 mb-4">${question.question}</h3>
                <div class="space-y-3">
                    ${question.options.map((opt, idx) => `
                        <button onclick="checkMicroTraining(${idx}, ${question.correct})" class="w-full bg-white rounded-xl p-4 text-left border-2 border-gray-200 hover:border-blue-300 transition-all btn-press">
                            <span class="text-gray-700">${opt}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function checkMicroTraining(selected, correct) {
        const buttons = document.querySelectorAll('#training-content button');
        buttons.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === correct) {
                btn.classList.add('bg-green-50', 'border-green-500');
                btn.classList.remove('border-gray-200');
            } else if (idx === selected && idx !== correct) {
                btn.classList.add('bg-red-50', 'border-red-500');
                btn.classList.remove('border-gray-200');
            }
        });

        setTimeout(() => {
            microTrainingIndex++;
            if (microTrainingIndex < microTrainingQuestions.length) {
                renderMicroTrainingQuestion();
            } else {
                showMicroTrainingResult();
            }
        }, 1500);
    }

    function showMicroTrainingResult() {
        const content = document.getElementById('training-content');
        content.innerHTML = `
            <div class="text-center py-8">
                <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="text-4xl">🎉</span>
                </div>
                <h3 class="text-xl font-bold text-warm-800 mb-2">训练完成！</h3>
                <p class="text-warm-500 mb-6">你已经掌握了基本的护理技能</p>
                <button onclick="closeMicroTraining()" class="w-full bg-purple-500 text-white rounded-xl py-4 font-semibold btn-press">完成</button>
            </div>
        `;
    }

    function showTrainingDetail(trainingId) {
        const data = trainingData[trainingId];
        document.getElementById('training-title').textContent = data.title;
        document.getElementById('modal-training-detail').style.display = 'flex';
        
        const content = document.getElementById('training-content');
        content.innerHTML = `
            <div class="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 text-center">
                <div class="text-6xl mb-3">${data.icon}</div>
                <div class="inline-block bg-primary text-white text-xs px-3 py-1 rounded-full mb-2">${data.category}</div>
                <p class="text-warm-600 text-sm">${data.purpose}</p>
            </div>
            
            <div class="bg-warm-50 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-icons text-primary text-sm">shopping_bag</span>
                    <h3 class="font-semibold text-warm-800">准备物品</h3>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${data.items.map(item => `<span class="bg-white px-3 py-1.5 rounded-lg text-xs text-warm-600 border border-gray-200">${item}</span>`).join('')}
                </div>
            </div>
            
            <div>
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-icons text-green-500 text-sm">list_alt</span>
                    <h3 class="font-semibold text-warm-800">操作步骤</h3>
                </div>
                <div class="space-y-3">
                    ${data.steps.map(step => `
                        <div class="bg-blue-50 rounded-xl p-4">
                            <div class="flex items-center gap-3">
                                <span class="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">${step.num}</span>
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        
                                        <span class="font-medium text-gray-700">${step.title}</span>
                                    </div>
                                    ${step.image ? `<div class="relative rounded-xl overflow-hidden mb-3 flex justify-center"><img src="${step.image}" alt="${step.title}" class="w-full max-w-[320px] aspect-square object-contain"><div class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 max-w-[70%]"><p class="text-xs font-semibold text-warm-800">步骤${step.num}：${step.title}</p><p class="text-xs text-warm-600 mt-1">${step.desc}</p></div></div>` : ""}<p class="text-sm text-warm-600${step.image ? " hidden" : ""}">${step.desc}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="bg-yellow-50 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="material-icons text-yellow-600 text-sm">error</span>
                    <h3 class="font-semibold text-yellow-700">常见错误</h3>
                </div>
                <ul class="text-sm text-yellow-700 space-y-1">
                    ${data.commonErrors.map(err => `<li>• ${err}</li>`).join('')}
                </ul>
            </div>
            
            <div class="bg-red-50 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="material-icons text-red-500 text-sm">warning</span>
                    <h3 class="font-semibold text-red-700">风险边界</h3>
                </div>
                <p class="text-sm text-red-600">${data.risks}</p>
            </div>
            
            <div class="bg-purple-50 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-icons text-purple-500 text-sm">help_outline</span>
                    <h3 class="font-semibold text-purple-700">微测验</h3>
                </div>
                ${Array.isArray(data.quiz) ? data.quiz.map((q, i) => `<div id="quiz-${i}" class="quiz-question${i===0?'':' hidden'}"><p class="text-sm text-warm-600 mb-3">${i+1}/${data.quiz.length}. ${q.question}</p><div class="space-y-2">${q.options.map((opt,j)=>`<button onclick="checkMultiQuiz(${i},${j},${q.correct},'${trainingId}')" class="w-full bg-white rounded-lg py-4 min-h-[48px] text-sm text-warm-600 border border-gray-200 hover:bg-warm-50 hover:border-blue-300 transition-all btn-press">${String.fromCharCode(65+j)}. ${opt}</button>`).join('')}</div><div id="quiz-result-${i}" class="mt-3 text-sm hidden"></div></div>`).join('') : `<p class="text-sm text-warm-600 mb-3">${data.quiz.question}</p><div class="space-y-2">${data.quiz.options.map((opt,idx)=>`<button onclick="checkQuiz(${idx},${data.quiz.correct},'${trainingId}')" class="w-full bg-white rounded-lg py-4 min-h-[48px] text-sm text-warm-600 border border-gray-200 hover:bg-warm-50 hover:border-blue-300 transition-all btn-press">${String.fromCharCode(65+idx)}. ${opt}</button>`).join('')}</div><div id="quiz-result" class="mt-3 text-sm hidden"></div>`}
            </div>
            
            <div class="bg-gray-100 rounded-xl p-4">
                <p class="text-xs text-warm-500 text-center">
                    ⚠️ 免责声明：以下内容仅供参考，不能替代专业医疗建议。如有疑问，请咨询您的主管护士或医生。
                </p>
            </div>
            
            <button onclick="closeTrainingDetail()" class="w-full bg-primary text-white rounded-xl py-4 min-h-[48px] font-semibold btn-press">完成学习</button>
        `;
        
        document.getElementById('modal-training-detail').style.display = 'flex';
    }

    function closeTrainingDetail() {
        document.getElementById('modal-training-detail').style.display = 'none';
        updateTrainingCompletion();
    }

    function checkQuiz(selected, correct, trainingId) {
        const quizResult = document.getElementById('quiz-result');
        const buttons = document.querySelectorAll('#training-content button');
        buttons.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === correct) {
                btn.classList.add('bg-green-100', 'border-green-500', 'text-green-700');
                btn.classList.remove('bg-white', 'border-gray-200', 'text-warm-600');
            } else if (idx === selected && idx !== correct) {
                btn.classList.add('bg-red-100', 'border-red-500', 'text-red-700');
                btn.classList.remove('bg-white', 'border-gray-200', 'text-warm-600');
            }
        });
        
        const quizHistory = Storage.get('quizHistory', {});
        quizHistory[trainingId] = {
            selected: selected,
            correct: correct,
            isCorrect: selected === correct,
            timestamp: Date.now()
        };
        Storage.set('quizHistory', quizHistory);
        
        if (selected === correct) {
            quizResult.innerHTML = '✅ 回答正确！继续保持学习哦~';
            quizResult.className = 'mt-3 text-sm text-green-600';
        } else {
            quizResult.innerHTML = '❌ 回答错误，请再仔细看看图解步骤。';
            quizResult.className = 'mt-3 text-sm text-red-600';
        }
        quizResult.classList.remove('hidden');
    }

    function editCarePackage() {
        const carePackage = Storage.get('carePackage', {"patient":"王XX，女，65岁","diagnosis":"腹腔镜胆囊切除术后第1天","allergy":"无药物过敏","medications":"无","history":"无"});
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-end z-50';
        modal.innerHTML = `
            <div class="bg-white w-full rounded-t-3xl p-4 slide-up">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-warm-800">编辑照护资料包</h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="p-2 hover:bg-gray-100 rounded-full">
                        <span class="material-icons text-warm-500">close</span>
                    </button>
                </div>
                <div class="space-y-3 mb-4">
                    <div>
                        <label class="block text-xs font-medium text-warm-600 mb-1">过敏史</label>
                        <input type="text" id="edit-allergy" class="w-full bg-warm-50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="无 / 青霉素等" value="${carePackage.allergy}">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-warm-600 mb-1">用药记录</label>
                        <textarea id="edit-medications" class="w-full bg-warm-50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" rows="3" placeholder="列出正在使用的药物...">${carePackage.medications}</textarea>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-warm-600 mb-1">病史</label>
                        <textarea id="edit-history" class="w-full bg-warm-50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" rows="3" placeholder="高血压、糖尿病等既往病史...">${carePackage.history}</textarea>
                    </div>
                </div>
                <div class="bg-orange-50 rounded-xl p-3 mb-4">
                    <p class="text-xs text-orange-600">⚠️ 注意：过敏史、用药记录、病史等属于医疗敏感信息，请谨慎编辑。建议在医生指导下填写。</p>
                </div>
                <button onclick="saveCarePackage()" class="w-full bg-primary text-white rounded-xl py-3 font-semibold btn-press">保存修改</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function saveCarePackage() {
        const carePackageKey = `carePackage_${currentScenario}`;
        const carePackage = Storage.get(carePackageKey, {"patient":"王XX，女，65岁","diagnosis":"腹腔镜胆囊切除术后第1天","allergy":"无药物过敏","medications":"无","history":"无"});
        
        carePackage.allergy = document.getElementById('edit-allergy').value;
        carePackage.medications = document.getElementById('edit-medications').value;
        carePackage.history = document.getElementById('edit-history').value;
        
        Storage.set(carePackageKey, carePackage);
        
        document.querySelector('.fixed.inset-0.bg-black\\/50').remove();
        loadCarePackage();
        UI.showToast('✅ 照护资料包已更新');
    }

    function loadCarePackage() {
        const carePackageKey = `carePackage_${currentScenario}`;
        const carePackage = Storage.get(carePackageKey, {"patient":"王XX，女，65岁","diagnosis":"腹腔镜胆囊切除术后第1天","allergy":"无药物过敏","medications":"无","history":"无"});
        
        const displayEl = document.getElementById('care-package-content');
        if (displayEl) {
            displayEl.innerHTML = `
                <div class="bg-white rounded-2xl p-4 card-shadow">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-bold text-warm-800">患者信息</h3>
                        <button onclick="editCarePackage()" class="text-xs text-primary font-medium">编辑</button>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex items-center justify-between">
                            <span class="text-warm-500">患者姓名</span>
                            <span class="font-medium text-warm-800">${carePackage.patient}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-warm-500">诊断信息</span>
                            <span class="font-medium text-warm-800">${carePackage.diagnosis}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-warm-500">过敏史</span>
                            <span class="font-medium text-red-600">${carePackage.allergy}</span>
                        </div>
                        ${carePackage.medications ? `
                        <div class="mt-3">
                            <div class="text-warm-500 mb-1">用药记录</div>
                            <div class="bg-warm-50 rounded-lg p-2 text-gray-700">${carePackage.medications}</div>
                        </div>` : ''}
                        ${carePackage.history ? `
                        <div class="mt-3">
                            <div class="text-warm-500 mb-1">既往病史</div>
                            <div class="bg-warm-50 rounded-lg p-2 text-gray-700">${carePackage.history}</div>
                        </div>` : ''}
                    </div>
                </div>
            `;
        }
    }

    function showEmergency() {
        const modalId = 'emergency-modal-' + Date.now();
        const nursePhone = Storage.get('nursePhone', '8888-0001');
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        
        const emergencySteps = currentScenario === 'post-op-night' 
            ? `
                <div class="bg-red-50 rounded-xl p-4 mb-4">
                    <h4 class="font-semibold text-red-800 text-sm mb-3">紧急处理步骤：</h4>
                    <div class="space-y-2">
                        <div class="flex items-start gap-2">
                            <span class="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                            <span class="text-red-700 text-sm">立即按下床头呼叫铃</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                            <span class="text-red-700 text-sm">保持患者平躺，不要移动</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                            <span class="text-red-700 text-sm">准备好患者信息，等待医护人员</span>
                        </div>
                    </div>
                </div>
                <div class="bg-amber-50 rounded-xl p-3 mb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-amber-600">📞</span>
                        <span class="text-amber-700 text-sm">护士站电话：</span>
                    </div>
                    <input type="tel" id="nurse-phone-input" value="${nursePhone}" 
                           class="w-full px-3 py-2 border border-amber-200 rounded-lg text-amber-800 text-sm focus:outline-none focus:border-warm-500"
                           placeholder="请输入护士站电话">
                    <button onclick="saveNursePhone(document.getElementById('nurse-phone-input').value)" 
                            class="mt-2 text-xs text-amber-600 hover:text-warm-500">保存号码</button>
                </div>
            `
            : `
                <div class="bg-red-50 rounded-xl p-4 mb-4">
                    <h4 class="font-semibold text-red-800 text-sm mb-3">紧急处理步骤：</h4>
                    <div class="space-y-2">
                        <div class="flex items-start gap-2">
                            <span class="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                            <span class="text-red-700 text-sm">立即拨打120急救电话</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                            <span class="text-red-700 text-sm">保持患者平躺，确保呼吸通畅</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                            <span class="text-red-700 text-sm">准备好患者病历和用药记录</span>
                        </div>
                    </div>
                </div>
                <div class="bg-amber-50 rounded-xl p-3 mb-4">
                    <div class="flex items-center gap-2">
                        <span class="text-amber-600">📞</span>
                        <span class="text-amber-700 text-sm">急救电话：<strong>120</strong></span>
                    </div>
                </div>
            `;
        
        modal.innerHTML = `
            <div class="bg-white w-[90%] max-w-sm rounded-2xl p-6 animate-slide-up">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="material-icons text-red-500 text-3xl">emergency</span>
                </div>
                <h3 class="text-xl font-bold text-warm-800 mb-2 text-center">紧急情况</h3>
                <p class="text-warm-600 text-sm mb-4">${currentScenario === 'post-op-night' ? '发现紧急情况，请按以下步骤处理：' : '发现紧急情况，请立即采取以下措施：'}</p>
                ${emergencySteps}
                <div class="flex gap-3">
                    <button onclick="document.getElementById('${modalId}').remove()" class="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold btn-press">取消</button>
                    <button class="flex-1 bg-red-500 text-white rounded-xl py-3 font-semibold btn-press">${currentScenario === 'post-op-night' ? '呼叫护士' : '拨打120'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function saveNursePhone(phone) {
        if (phone && phone.trim()) {
            Storage.set('nursePhone', phone.trim());
            UI.showToast('✅ 号码已保存');
        }
    }

    function getMedicationKey() {
        return 'medications_' + currentScenario;
    }

    function openAddMedication() {
        const today = new Date().toISOString().split('T')[0];
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white w-[90%] max-w-sm rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                <h3 class="text-lg font-bold text-warm-800 mb-4 text-center">添加用药记录</h3>
                <div class="space-y-3">
                    <div>
                        <label class="text-xs text-warm-500 mb-1 block">药品名称</label>
                        <input type="text" id="med-name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary" placeholder="如：阿莫西林">
                    </div>
                    <div>
                        <label class="text-xs text-warm-500 mb-1 block">服用剂量</label>
                        <input type="text" id="med-dose" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary" placeholder="如：1片">
                    </div>
                    <div>
                        <label class="text-xs text-warm-500 mb-1 block">每日频次</label>
                        <select id="med-frequency" onchange="updateMedTimes()" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary">
                            <option value="1">每日1次</option>
                            <option value="2">每日2次</option>
                            <option value="3">每日3次</option>
                            <option value="4">每日4次</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs text-warm-500 mb-1 block">服用时段</label>
                        <div id="med-times-container" class="space-y-2">
                            <input type="time" id="med-time-0" value="08:00" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary">
                        </div>
                    </div>
                    <div>
                        <label class="text-xs text-warm-500 mb-1 block">开始日期</label>
                        <input type="date" id="med-start-date" value="${today}" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary">
                    </div>
                    <div>
                        <label class="text-xs text-warm-500 mb-1 block">结束日期</label>
                        <input type="date" id="med-end-date" value="${today}" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary">
                    </div>
                </div>
                <div class="flex gap-3 mt-6">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold btn-press">取消</button>
                    <button onclick="saveMedication()" class="flex-1 bg-primary text-white rounded-xl py-3 font-semibold btn-press">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        updateMedTimes();
    }

    function updateMedTimes() {
        const frequency = parseInt(document.getElementById('med-frequency').value);
        const container = document.getElementById('med-times-container');
        if (!container) return;
        
        const defaultTimes = {
            1: ['08:00'],
            2: ['08:00', '20:00'],
            3: ['08:00', '14:00', '20:00'],
            4: ['06:00', '12:00', '18:00', '24:00']
        };
        
        container.innerHTML = defaultTimes[frequency].map((time, index) => `
            <input type="time" id="med-time-${index}" value="${time}" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary">
        `).join('');
    }

    function saveMedication() {
        const name = document.getElementById('med-name').value.trim();
        const dose = document.getElementById('med-dose').value.trim();
        const frequency = parseInt(document.getElementById('med-frequency').value);
        const startDate = document.getElementById('med-start-date').value;
        const endDate = document.getElementById('med-end-date').value;
        
        if (!name || !dose || !startDate || !endDate) {
            UI.showToast('❌ 请填写完整信息');
            return;
        }
        
        if (startDate > endDate) {
            UI.showToast('❌ 结束日期不能早于开始日期');
            return;
        }
        
        const times = [];
        for (let i = 0; i < frequency; i++) {
            const timeInput = document.getElementById(`med-time-${i}`);
            if (timeInput && timeInput.value) {
                times.push(timeInput.value);
            }
        }
        
        const medicationKey = getMedicationKey();
        const medications = Storage.get(medicationKey, []);
        medications.push({
            id: Date.now(),
            name: name,
            dose: dose,
            frequency: frequency,
            times: times,
            startDate: startDate,
            endDate: endDate,
            takenLog: {}
        });
        Storage.set(medicationKey, medications);
        
        document.querySelector('.fixed.inset-0.bg-black\\/50').remove();
        loadMedications();
        UI.showToast('✅ 用药记录已添加');
    }

    function loadMedications() {
        try {
            const listEl = document.getElementById('medication-list');
            if (!listEl) return;
            
            const medicationKey = getMedicationKey();
            let medications = Storage.get(medicationKey, []);
            const today = new Date().toLocaleDateString('zh-CN');
            const todayIso = new Date().toISOString().split('T')[0];
            
            medications = medications.filter(med => {
                if (!med.name || !med.dose) return false;
                if (med.time && !med.times) return false;
                if (!med.times || !Array.isArray(med.times)) return false;
                if (!med.startDate || !med.endDate) return false;
                return true;
            });
            
            Storage.set(medicationKey, medications);
            
            if (medications.length === 0) {
                listEl.innerHTML = '<div class="text-center text-warm-500 text-sm py-4">暂无用药记录，点击下方添加</div>';
                return;
            }
            
            medications.sort((a, b) => a.times[0].localeCompare(b.times[0]));
            
            listEl.innerHTML = medications.map(med => {
                const isExpired = todayIso > med.endDate;
                const isActive = todayIso >= med.startDate && todayIso <= med.endDate;
                const todayTaken = med.takenLog[today] || [];
                
                const timeButtons = med.times.map((time, index) => {
                    const isTaken = todayTaken.includes(time);
                    return `
                        <button onclick="toggleMedicationTime(${med.id}, '${time}')" 
                            class="px-3 py-1.5 rounded-lg text-xs font-medium ${isTaken ? 'bg-primary text-white' : (isActive ? 'bg-gray-100 text-gray-600 hover:bg-warm-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed')}">
                            ${time} ${isTaken ? '✓' : ''}
                        </button>
                    `;
                }).join('');
                
                return `
                    <div class="bg-warm-50 rounded-xl p-3 mb-2 border border-warm-100">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="font-medium text-warm-800 text-sm">${med.name}</span>
                                ${isExpired ? '<span class="text-xs text-gray-400">已过期</span>' : ''}
                                ${isActive ? '<span class="text-xs text-green-500">进行中</span>' : '<span class="text-xs text-gray-400">未开始</span>'}
                            </div>
                            <button onclick="deleteMedication(${med.id})" class="text-warm-400 hover:text-red-500">🗑️</button>
                        </div>
                        <div class="text-warm-500 text-xs mb-2">${med.dose} · 每日${med.frequency}次 · ${med.startDate}至${med.endDate}</div>
                        <div class="flex flex-wrap gap-1.5">${timeButtons}</div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.error('loadMedications error:', e);
            const listEl = document.getElementById('medication-list');
            if (listEl) {
                listEl.innerHTML = '<div class="text-center text-warm-500 text-sm py-4">暂无用药记录，点击下方添加</div>';
            }
        }
    }

    function toggleMedicationTime(id, time) {
        const medicationKey = getMedicationKey();
        const medications = Storage.get(medicationKey, []);
        const med = medications.find(m => m.id === id);
        if (!med) return;
        
        const today = new Date().toLocaleDateString('zh-CN');
        if (!med.takenLog[today]) {
            med.takenLog[today] = [];
        }
        
        const index = med.takenLog[today].indexOf(time);
        if (index > -1) {
            med.takenLog[today].splice(index, 1);
        } else {
            med.takenLog[today].push(time);
        }
        
        Storage.set(medicationKey, medications);
        loadMedications();
        UI.showToast(index > -1 ? '已取消打卡' : '✅ 已记录服药');
    }

    function deleteMedication(id) {
        const medicationKey = getMedicationKey();
        let medications = Storage.get(medicationKey, []);
        medications = medications.filter(m => m.id !== id);
        Storage.set(medicationKey, medications);
        loadMedications();
        UI.showToast('🗑️ 已删除');
    }

    function checkMedicationReminder() {
        try {
            const medicationKey = getMedicationKey();
            const medications = Storage.get(medicationKey, []);
            const today = new Date().toLocaleDateString('zh-CN');
            const todayIso = new Date().toISOString().split('T')[0];
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            
            const dueMeds = [];
            medications.forEach(m => {
                if (!m.times || !Array.isArray(m.times)) return;
                if (!m.startDate || !m.endDate) return;
                if (todayIso < m.startDate || todayIso > m.endDate) return;
                if (!m.takenLog) m.takenLog = {};
                if (!m.takenLog[today]) m.takenLog[today] = [];
                if (m.times.includes(currentTime) && !m.takenLog[today].includes(currentTime)) {
                    dueMeds.push(m.name);
                }
            });
            
            if (dueMeds.length > 0) {
                const medNames = dueMeds.join('、');
                showAlertModal(`现在是${currentTime}，该给妈妈服用${medNames}了。建议按时服药，帮助身体恢复。`);
            }
        } catch (e) {
            console.error('checkMedicationReminder error:', e);
        }
    }

    function loadCheckContent() {
        if (currentScenario === 'post-op-night') {
            loadRoundsContent();
        } else {
            loadFollowUpContent();
        }
    }

    function getHandoverSummary() {
        const todoState = Storage.get('todoState', {});
        const recordsKey = `careRecords_${currentScenario}`;
        const records = Storage.get(recordsKey, []);
        const today = new Date().toLocaleDateString('zh-CN');
        const todayRecords = records.filter(r => r.date === today);
        
        const summary = [];
        
        const completedTasks = Object.keys(todoState).filter(id => todoState[id]);
        if (completedTasks.length > 0) {
            const taskNames = {
                'turn-over': '翻身拍背',
                'check-vitals': '生命体征检查',
                'urine-record': '排尿记录',
                'pain-assess': '疼痛评估',
                'drain-check': '引流管检查',
                'mouth-care': '口腔护理',
                'change-pad': '更换尿垫',
                'medication': '服药提醒',
                'wound-check': '伤口观察',
                'ambulation': '下床活动'
            };
            completedTasks.forEach(id => {
                if (taskNames[id]) {
                    summary.push(`✓ ${taskNames[id]}已完成`);
                }
            });
        }
        
        const urineRecords = todayRecords.filter(r => r.type === 'urine');
        if (urineRecords.length > 0) {
            const total = urineRecords.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
            summary.push(`💧 排尿记录：${urineRecords.length}次，共${total}ml`);
        }
        
        const painRecords = todayRecords.filter(r => r.type === 'pain');
        if (painRecords.length > 0) {
            const maxPain = Math.max(...painRecords.map(r => parseFloat(r.value) || 0));
            summary.push(`😣 疼痛评分最高：${maxPain}分`);
        }
        
        const tempRecords = todayRecords.filter(r => r.type === 'temp' || r.type === 'fever');
        if (tempRecords.length > 0) {
            const lastTemp = tempRecords[tempRecords.length - 1].value;
            summary.push(`🌡️ 最新体温：${lastTemp}℃`);
        }
        
        if (summary.length === 0) {
            summary.push('暂无记录，请先在「今晚任务」中完成记录');
        }
        
        return summary;
    }

    function loadRoundsContent() {
        const handoverSummary = getHandoverSummary();
        
        const contentEl = document.getElementById('check-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="bg-primary rounded-2xl p-4 text-white mb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-sm">description</span>
                        <h3 class="font-semibold">查房准备</h3>
                    </div>
                    <p class="text-blue-50 text-sm">医生查房时，准备好这些问题能帮助医生更好地了解妈妈的情况。</p>
                </div>
                
                <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                    <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                        <span class="material-icons text-green-500 text-sm">list_alt</span>
                        交班内容（自动汇总）
                    </h3>
                    <div class="space-y-3">
                        ${handoverSummary.map(item => `
                            <div class="flex items-start gap-2 text-sm p-3 bg-warm-50 rounded-xl">
                                <span class="text-green-500 mt-0.5">${item.startsWith('✓') ? '✓' : ''}</span>
                                <span class="text-warm-600">${item}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                    <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                        <span class="material-icons text-primary text-sm">edit_note</span>
                        补充记录
                    </h3>
                    <textarea id="handover-note" class="w-full p-3 bg-warm-50 rounded-xl text-sm border-none outline-none resize-none h-24" placeholder="医生可能特别关心的其他情况..."></textarea>
                    <button onclick="saveHandoverNote()" class="mt-3 w-full bg-primary text-white py-2 rounded-xl text-sm font-medium btn-press">保存补充</button>
                </div>
                
                <div class="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-orange-600 text-sm">info</span>
                        <h3 class="font-semibold text-orange-800">提示</h3>
                    </div>
                    <p class="text-orange-700 text-sm">医生查房时，把你的观察和记录告诉医生，不要遗漏任何细节。</p>
                </div>
            `;
        }
    }

    function saveHandoverNote() {
        const note = document.getElementById('handover-note').value;
        if (note.trim()) {
            Storage.set('handoverNote', note);
            UI.showToast('✅ 补充记录已保存');
        }
    }

    function loadFollowUpContent() {
        const handoverSummary = getHandoverSummary();
        const prepList = [
            '准备好出院小结和病历资料',
            '整理好用药清单',
            '记录好近期体温和血压',
            '想好要问医生的问题'
        ];

        const contentEl = document.getElementById('check-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="bg-teal-500 rounded-2xl p-4 text-white mb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-sm">home</span>
                        <h3 class="font-semibold">复诊准备</h3>
                    </div>
                    <p class="text-teal-50 text-sm">出院后的复诊非常重要，提前准备好这些资料能让复诊更高效。</p>
                </div>
                
                <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                    <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                        <span class="material-icons text-green-500 text-sm">list_alt</span>
                        近期记录（自动汇总）
                    </h3>
                    <div class="space-y-3">
                        ${handoverSummary.map(item => `
                            <div class="flex items-start gap-2 text-sm p-3 bg-warm-50 rounded-xl">
                                <span class="text-green-500 mt-0.5">${item.startsWith('✓') ? '✓' : ''}</span>
                                <span class="text-warm-600">${item}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                    <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                        <span class="material-icons text-teal-500 text-sm">checklist</span>
                        复诊准备清单
                    </h3>
                    <div class="space-y-2">
                        ${prepList.map(item => `
                            <div class="flex items-center gap-2 text-sm">
                                <span class="text-green-500">□</span>
                                <span class="text-warm-600">${item}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                    <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                        <span class="material-icons text-primary text-sm">edit_note</span>
                        补充记录
                    </h3>
                    <textarea id="handover-note" class="w-full p-3 bg-warm-50 rounded-xl text-sm border-none outline-none resize-none h-24" placeholder="医生可能特别关心的其他情况..."></textarea>
                    <button onclick="saveHandoverNote()" class="mt-3 w-full bg-teal-500 text-white py-2 rounded-xl text-sm font-medium btn-press">保存补充</button>
                </div>
                
                <div class="bg-green-50 rounded-2xl p-4 border border-green-100">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-green-600 text-sm">info</span>
                        <h3 class="font-semibold text-green-800">提示</h3>
                    </div>
                    <p class="text-green-700 text-sm">复诊时带齐所有资料，详细告诉医生妈妈的恢复情况，有任何疑问都可以问。</p>
                </div>
            `;
        }
    }

    function getMoodIcon(checkinData) {
        const score = calculateBatteryScore(checkinData);
        if (score <= 30) return '😫';
        if (score <= 60) return '😐';
        return '😊';
    }

    function calculateBatteryScore(checkinData) {
        let score = 100;
        
        const sleepMap = { '好': 0, '一般': -15, '很差': -35 };
        score += sleepMap[checkinData.sleep] || 0;
        
        const foodMap = { '正常': 0, '凑合': -10, '没吃': -25 };
        score += foodMap[checkinData.food] || 0;
        
        const moodMap = { '还行': 0, '烦躁': -15, '想哭': -30 };
        score += moodMap[checkinData.mood] || 0;
        
        const helpMap = { '有': 0, '没有': -20 };
        score += helpMap[checkinData.help] || 0;
        
        const physicalMap = { '有': -15, '没有': 0 };
        score += physicalMap[checkinData.physical] || 0;
        
        const consecutiveDays = parseInt(checkinData.consecutiveDays) || 0;
        score -= consecutiveDays * 8;
        
        return Math.max(10, Math.min(100, score));
    }

    function getBatteryLevel(checkinData) {
        const score = calculateBatteryScore(checkinData);
        return `${score}%`;
    }

    function getBatteryStatus(checkinData) {
        const score = calculateBatteryScore(checkinData);
        if (score >= 70) return { text: '电量充足', color: '#10b981', status: 'good' };
        if (score >= 40) return { text: '电量偏低', color: '#f59e0b', status: 'medium' };
        return { text: '电量告急', color: '#ef4444', status: 'critical' };
    }

    function getBatteryAdvice(checkinData) {
        const score = calculateBatteryScore(checkinData);
        const status = getBatteryStatus(checkinData);
        
        if (status.status === 'critical') {
            let advice = '⚠️ 你的照护负荷很高，必须立即采取行动！';
            if (checkinData.sleep !== '好') advice += '<br>• 立即闭眼打盹20分钟（定闹钟）';
            if (checkinData.food !== '正常') advice += '<br>• 吃点能量棒或巧克力补充体力';
            if (checkinData.help !== '有') advice += '<br>• 马上联系家人或护工替班2小时';
            return advice;
        }
        
        if (status.status === 'medium') {
            let advice = '⚡ 你的电量偏低，请注意休息';
            if (checkinData.sleep !== '好') advice += '<br>• 趁妈妈睡着时抓紧补觉';
            if (checkinData.food !== '正常') advice += '<br>• 记得吃点东西';
            if (checkinData.help !== '有') advice += '<br>• 考虑找人替班';
            return advice;
        }
        
        return '✅ 状态不错，继续保持！记得定时喝水和休息';
    }

    const postOpPainPoints = [
        {
            id: 'pain',
            icon: '😣',
            title: '夜间疼痛加重',
            desc: '术后疼痛通常在夜间更明显，妈妈可能会因此难以入睡。',
            advice: '应对：提前准备好止痛药（遵医嘱），疼痛评分超过7分时及时告知护士',
            triggers: [
                { field: 'sleep', value: '很差', weight: 8 },
                { field: 'mood', value: '烦躁', weight: 5 },
                { field: 'physical', value: '有', weight: 6 }
            ],
            baseScore: 60
        },
        {
            id: 'infusion',
            icon: '🔔',
            title: '凌晨换液',
            desc: '大约凌晨2点左右护士会来更换输液，可能会被叫醒。',
            advice: '应对：提前准备好拖鞋和外套，保持手机静音，换液后抓紧时间补觉',
            triggers: [
                { field: 'sleep', value: '一般', weight: 6 },
                { field: 'sleep', value: '很差', weight: 4 }
            ],
            baseScore: 55
        },
        {
            id: 'sleep_deprivation',
            icon: '😴',
            title: '睡眠严重不足',
            desc: '翻身、观察、换液会让整晚睡不好，第二天会非常疲惫。',
            advice: '应对：趁妈妈睡着时闭眼打盹20分钟（定闹钟），准备好咖啡或能量饮料',
            triggers: [
                { field: 'sleep', value: '很差', weight: 10 },
                { field: 'consecutiveDays', value: '3', weight: 5 },
                { field: 'consecutiveDays', value: '4', weight: 7 },
                { field: 'consecutiveDays', value: '5+', weight: 9 }
            ],
            baseScore: 50
        },
        {
            id: 'fatigue',
            icon: '💪',
            title: '体力消耗过大',
            desc: '翻身、扶抱、换尿垫等动作会消耗大量体力，精神高度紧张会加重疲劳。',
            advice: '应对：准备好能量棒和水，随时补充；使用翻身辅助工具减少体力消耗',
            triggers: [
                { field: 'physical', value: '有', weight: 8 },
                { field: 'food', value: '没吃', weight: 6 },
                { field: 'food', value: '凑合', weight: 4 }
            ],
            baseScore: 45
        },
        {
            id: 'anxiety',
            icon: '😰',
            title: '焦虑情绪',
            desc: '怕做错、怕妈妈不舒服、怕有突发状况，精神高度紧张。',
            advice: '应对：深呼吸（4秒吸，6秒呼），列出明早要问医生的问题，把担忧写下来',
            triggers: [
                { field: 'mood', value: '烦躁', weight: 7 },
                { field: 'mood', value: '想哭', weight: 9 },
                { field: 'help', value: '没有', weight: 5 }
            ],
            baseScore: 40
        },
        {
            id: 'guilt',
            icon: '😔',
            title: '内疚感',
            desc: '心疼妈妈疼痛却无能为力，产生强烈的内疚感。',
            advice: '应对：告诉自己你已经尽力了，允许自己有情绪；和同样经历的人聊聊',
            triggers: [
                { field: 'mood', value: '想哭', weight: 8 },
                { field: 'help', value: '没有', weight: 4 }
            ],
            baseScore: 35
        }
    ];

    const homeCarePainPoints = [
        {
            id: 'wound_night',
            icon: '🏥',
            title: '伤口夜间不适',
            desc: '回家后环境变化可能让伤口感觉不适，尤其是在夜间安静时。',
            advice: '应对：睡前检查伤口敷料是否干燥，准备好止痛药（遵医嘱），保持室内温度适宜',
            triggers: [
                { field: 'sleep', value: '很差', weight: 8 },
                { field: 'physical', value: '有', weight: 6 }
            ],
            baseScore: 60
        },
        {
            id: 'getting_up',
            icon: '🚶',
            title: '夜间起身困难',
            desc: '妈妈可能因伤口疼痛或身体虚弱，夜间起床上厕所困难。',
            advice: '应对：在床边准备好便盆或尿壶，安装夜灯，确保通往卫生间的道路畅通',
            triggers: [
                { field: 'physical', value: '有', weight: 7 },
                { field: 'sleep', value: '一般', weight: 5 }
            ],
            baseScore: 55
        },
        {
            id: 'caregiver_tired',
            icon: '😴',
            title: '照护疲劳累积',
            desc: '居家照护是长期过程，连续几天下来你会感到身心俱疲。',
            advice: '应对：制定轮班表，安排家人轮流看护，每天给自己留出至少1小时的个人时间',
            triggers: [
                { field: 'consecutiveDays', value: '3', weight: 6 },
                { field: 'consecutiveDays', value: '4', weight: 8 },
                { field: 'consecutiveDays', value: '5+', weight: 10 },
                { field: 'help', value: '没有', weight: 5 }
            ],
            baseScore: 50
        },
        {
            id: 'sleep_quality',
            icon: '🛏️',
            title: '睡眠质量差',
            desc: '在家陪护可能会被妈妈翻身、喝水等动作频繁打断睡眠。',
            advice: '应对：准备耳塞和眼罩，在妈妈房间隔壁休息，设置合理的间隔提醒',
            triggers: [
                { field: 'sleep', value: '很差', weight: 9 },
                { field: 'sleep', value: '一般', weight: 6 }
            ],
            baseScore: 45
        },
        {
            id: 'meal_skip',
            icon: '🍞',
            title: '饮食不规律',
            desc: '忙着照顾妈妈，自己可能会忘记吃饭或随便对付。',
            advice: '应对：提前准备好方便食用的餐食，设定闹钟提醒自己吃饭',
            triggers: [
                { field: 'food', value: '没吃', weight: 7 },
                { field: 'food', value: '凑合', weight: 5 }
            ],
            baseScore: 40
        },
        {
            id: 'emotional_isolation',
            icon: '😔',
            title: '情绪孤立',
            desc: '长时间居家照护，与外界隔离，容易感到孤独和无助。',
            advice: '应对：每天和朋友或家人通一次电话，加入照护者互助群',
            triggers: [
                { field: 'mood', value: '烦躁', weight: 6 },
                { field: 'mood', value: '想哭', weight: 8 },
                { field: 'help', value: '没有', weight: 5 }
            ],
            baseScore: 35
        }
    ];

    function getPersonalizedPainPoints(painPointsPool, checkinData) {
        const scoredPoints = painPointsPool.map(point => {
            let score = point.baseScore;
            point.triggers.forEach(trigger => {
                if (checkinData[trigger.field] === trigger.value) {
                    score += trigger.weight;
                }
            });
            return { ...point, score };
        });
        
        scoredPoints.sort((a, b) => b.score - a.score);
        
        return scoredPoints.slice(0, 3);
    }

    function loadShareContent() {
        const contentEl = document.getElementById('share-content');
        if (!contentEl) return;

        contentEl.innerHTML = `
            <div class="bg-green-500 rounded-2xl p-4 text-white mb-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="material-icons text-sm">family_restroom</span>
                    <h3 class="font-semibold">兄弟姐妹换班同步</h3>
                </div>
                <p class="text-green-50 text-sm">一键生成当前照护状态报告，家人扫码即可查看，避免信息断层。</p>
            </div>

            <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                    <span class="material-icons text-primary text-sm">description</span>
                    当前状态报告
                </h3>
                <div id="handover-report" class="space-y-3">
                    ${generateHandoverReport()}
                </div>
                <button onclick="generateFullReport()" class="mt-4 w-full bg-primary text-white py-2 rounded-xl text-sm font-medium btn-press">
                    刷新报告
                </button>
            </div>

            <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                    <span class="material-icons text-green-500 text-sm">qr_code</span>
                    分享二维码
                </h3>
                <div class="flex flex-col items-center">
                    <div id="qr-code" class="bg-white p-4 rounded-xl border border-gray-200"></div>
                    <p class="text-warm-500 text-sm mt-3">家人扫码即可查看当前状态</p>
                    <button onclick="shareData()" class="mt-3 w-full bg-green-500 text-white py-2 rounded-xl text-sm font-medium btn-press">
                        重新生成二维码
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                    <span class="material-icons text-secondary text-sm">sync_alt</span>
                    导入家人数据
                </h3>
                <p class="text-warm-500 text-sm mb-3">扫描家人分享的二维码，同步他们的照护记录</p>
                <div class="flex gap-2">
                    <input type="text" id="import-code" class="flex-1 bg-warm-50 rounded-xl p-3 text-sm border-none outline-none" placeholder="输入分享码...">
                    <button onclick="importData()" class="bg-secondary text-white px-4 py-2 rounded-xl text-sm font-medium btn-press">
                        导入
                    </button>
                </div>
            </div>

            <div class="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                <div class="flex items-center gap-2 mb-2">
                    <span class="material-icons text-orange-600 text-sm">info</span>
                    <h3 class="font-semibold text-orange-800">换班提醒</h3>
                </div>
                <p class="text-orange-700 text-sm">换班前，请先查看上一位照护者的记录，确保照护不中断。建议每次换班时生成报告分享给下一位家人。</p>
            </div>
        `;

        setTimeout(() => {
            generateQRCode();
        }, 100);
    }

    function generateHandoverReport() {
        const todoState = Storage.get('todoState', {});
        const recordsKey = `careRecords_${currentScenario}`;
        const records = Storage.get(recordsKey, []);
        const checkinData = Storage.get('caregiverCheckin', {});
        const today = new Date().toLocaleDateString('zh-CN');
        const todayRecords = records.filter(r => r.date === today);

        const completedTasks = Object.keys(todoState).filter(id => todoState[id]).length;
        const totalTasks = Object.keys(todoState).length;

        let report = `
            <div class="grid grid-cols-3 gap-2">
                <div class="bg-blue-50 rounded-xl p-3 text-center">
                    <div class="text-xl font-bold text-blue-600">${completedTasks}/${totalTasks}</div>
                    <div class="text-xs text-primary">任务完成</div>
                </div>
                <div class="bg-green-50 rounded-xl p-3 text-center">
                    <div class="text-xl font-bold text-green-600">${todayRecords.length}</div>
                    <div class="text-xs text-green-500">今日记录</div>
                </div>
                <div class="bg-orange-50 rounded-xl p-3 text-center">
                    <div class="text-xl font-bold text-orange-600">${checkinData.mood || '--'}</div>
                    <div class="text-xs text-secondary">照护者状态</div>
                </div>
            </div>
        `;

        if (completedTasks > 0) {
            const taskNames = {
                'turn-over': '翻身拍背',
                'check-vitals': '生命体征检查',
                'urine-record': '排尿记录',
                'pain-assess': '疼痛评估',
                'drain-check': '引流管检查',
                'mouth-care': '口腔护理',
                'change-pad': '更换尿垫',
                'medication': '服药提醒',
                'wound-check': '伤口观察',
                'ambulation': '下床活动'
            };
            report += `
                <div class="bg-warm-50 rounded-xl p-3">
                    <div class="text-sm font-medium text-gray-700 mb-2">✅ 已完成任务</div>
                    <div class="flex flex-wrap gap-2">
                        ${Object.keys(todoState).filter(id => todoState[id]).map(id => `
                            <span class="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs">${taskNames[id] || id}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (todayRecords.length > 0) {
            const urineRecords = todayRecords.filter(r => r.type === 'urine');
            const painRecords = todayRecords.filter(r => r.type === 'pain');
            const tempRecords = todayRecords.filter(r => r.type === 'temp' || r.type === 'fever');

            let recordsHtml = '';
            if (urineRecords.length > 0) {
                const total = urineRecords.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
                recordsHtml += `<div class="flex justify-between text-sm"><span>💧 排尿</span><span>${urineRecords.length}次，${total}ml</span></div>`;
            }
            if (painRecords.length > 0) {
                const maxPain = Math.max(...painRecords.map(r => parseFloat(r.value) || 0));
                recordsHtml += `<div class="flex justify-between text-sm"><span>😣 疼痛</span><span>最高${maxPain}分</span></div>`;
            }
            if (tempRecords.length > 0) {
                const lastTemp = tempRecords[tempRecords.length - 1].value;
                recordsHtml += `<div class="flex justify-between text-sm"><span>🌡️ 体温</span><span>${lastTemp}°C</span></div>`;
            }

            if (recordsHtml) {
                report += `
                    <div class="bg-warm-50 rounded-xl p-3">
                        <div class="text-sm font-medium text-gray-700 mb-2">📋 今日关键数据</div>
                        <div class="space-y-1">${recordsHtml}</div>
                    </div>
                `;
            }
        }

        if (checkinData.sleep || checkinData.food || checkinData.mood) {
            report += `
                <div class="bg-warm-50 rounded-xl p-3">
                    <div class="text-sm font-medium text-gray-700 mb-2">💪 照护者续航状态</div>
                    <div class="grid grid-cols-3 gap-2 text-center">
                        <div><div class="text-xs text-warm-500">睡眠</div><div class="text-sm font-medium">${checkinData.sleep || '--'}</div></div>
                        <div><div class="text-xs text-warm-500">饮食</div><div class="text-sm font-medium">${checkinData.food || '--'}</div></div>
                        <div><div class="text-xs text-warm-500">情绪</div><div class="text-sm font-medium">${checkinData.mood || '--'}</div></div>
                    </div>
                </div>
            `;
        }

        report += `
            <div class="text-xs text-gray-400 text-center pt-2">
                报告生成时间：${new Date().toLocaleString('zh-CN')}
            </div>
        `;

        return report;
    }

    function generateFullReport() {
        const reportEl = document.getElementById('handover-report');
        if (reportEl) {
            reportEl.innerHTML = generateHandoverReport();
        }
        UI.showToast('报告已刷新');
    }

    function generateQRCode() {
        const qrEl = document.getElementById('qr-code');
        if (!qrEl) return;

        const dataToShare = {
            scenario: currentScenario,
            todoState: Storage.get('todoState', {}),
            records: Storage.get(`careRecords_${currentScenario}`, []),
            checkinData: Storage.get('caregiverCheckin', {}),
            carePackage: Storage.get('carePackage', {}),
            timestamp: Date.now()
        };

        try {
            QRCode.toCanvas(qrEl, JSON.stringify(dataToShare), {
                width: 200,
                margin: 2,
                color: {
                    dark: '#1f2937',
                    light: '#ffffff'
                }
            }, function(error) {
                if (error) {
                    console.error('QR Code generation error:', error);
                    qrEl.innerHTML = '<p class="text-warm-500 text-sm">无法生成二维码</p>';
                }
            });
        } catch (e) {
            qrEl.innerHTML = '<p class="text-warm-500 text-sm">二维码功能不可用</p>';
        }
    }

    function shareData() {
        generateQRCode();
        UI.showToast('二维码已重新生成');
    }

    function importData() {
        const importCode = document.getElementById('import-code').value;
        if (!importCode) {
            UI.showToast('请输入分享码');
            return;
        }

        try {
            const decodedData = JSON.parse(decodeURIComponent(atob(importCode)));
            
            if (decodedData.todoState) {
                Storage.set('todoState', decodedData.todoState);
            }
            if (decodedData.records) {
                Storage.set(`careRecords_${currentScenario}`, decodedData.records);
            }
            if (decodedData.checkinData) {
                Storage.set('caregiverCheckin', decodedData.checkinData);
            }
            if (decodedData.carePackage) {
                Storage.set('carePackage', decodedData.carePackage);
            }

            UI.showToast('数据导入成功');
            document.getElementById('import-code').value = '';
            generateFullReport();
        } catch (e) {
            UI.showToast('导入失败，分享码无效');
        }
    }

    function loadSupportContent() {
        const supportData = {
            tips: [
                { icon: '☕', title: '及时补充水分', desc: '照顾病人容易忘记喝水，记得每隔1小时喝一杯水' },
                { icon: '😴', title: '抓住机会休息', desc: '病人入睡后，你也抓紧时间闭目养神10-15分钟' },
                { icon: '🍎', title: '合理安排饮食', desc: '准备一些方便食用的水果和坚果，饿了随时吃' },
                { icon: '🤝', title: '寻求家人帮助', desc: '不要独自承担，可以让家人轮流来帮忙' }
            ],
            checkinItems: [
                { id: 'sleep', label: '昨晚睡眠', options: ['好', '一般', '很差'], icons: ['😴', '😐', '😫'] },
                { id: 'food', label: '今天吃饭', options: ['正常', '凑合', '没吃'], icons: ['🍱', '🥗', '🍚'] },
                { id: 'mood', label: '今天情绪', options: ['还行', '烦躁', '想哭'], icons: ['😊', '😤', '😭'] },
                { id: 'help', label: '今天是否有人帮忙', options: ['有', '没有'], icons: ['🤝', '👤'] },
                { id: 'physical', label: '今天是否有高体力照护', options: ['有', '没有'], icons: ['💪', '😌'] },
                { id: 'consecutiveDays', label: '连续陪护天数', options: ['0', '1', '2', '3', '4', '5+'], icons: ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'] }
            ],
            survivalKit: [
                { icon: '🛏️', name: '折叠床/充气床垫', desc: '比硬椅子舒服太多' },
                { icon: '🎧', name: '耳塞+眼罩', desc: '隔绝噪音和光线' },
                { icon: '⚡', name: '能量棒/巧克力', desc: '快速补充体力' },
                { icon: '🥤', name: '保温杯', desc: '随时喝到热水' },
                { icon: '📱', name: '充电宝', desc: '手机保持有电' },
                { icon: '🧴', name: '护手霜', desc: '频繁洗手保护双手' }
            ],
            resources: [
                { title: '社区养老服务', desc: '提供居家照护、上门护理等服务', phone: '12349' },
                { title: '心理援助热线', desc: '专业心理咨询，缓解照护压力', phone: '400-161-9995' },
                { title: '护工服务', desc: '专业护工上门服务，减轻照护负担', phone: '请咨询当地医院' }
            ]
        };

        const checkinData = Storage.get('caregiverCheckin', {});
        const batteryScore = calculateBatteryScore(checkinData);
        const batteryStatus = getBatteryStatus(checkinData);
        const circumference = 2 * Math.PI * 40;
        const strokeDashoffset = circumference - (batteryScore / 100) * circumference;
        
        const contentEl = document.getElementById('support-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white mb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-sm">favorite</span>
                        <h3 class="font-semibold">照护者续航站</h3>
                    </div>
                    <p class="text-white/80 text-sm">照顾别人的同时，别忘了照顾好自己。你的身心健康同样重要。</p>
                </div>
                
                <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                    <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                        <span class="material-icons text-pink-500 text-sm">sentiment_satisfied</span>
                        轻量打卡
                    </h3>
                    <div class="space-y-3">
                        ${supportData.checkinItems.map((item, idx) => `
                            <div>
                                <div class="text-sm text-warm-600 mb-2">${item.label}</div>
                                <div class="flex flex-wrap gap-2">
                                    ${item.options.map((opt, optIdx) => {
                                        const isSelected = checkinData[item.id] === opt;
                                        return `<button onclick="setCheckin('${item.id}', '${opt}')" class="${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-warm-600'} px-3 py-1.5 rounded-lg text-sm font-medium transition-all btn-press">${item.icons ? item.icons[optIdx] + ' ' : ''}${opt}</button>`;
                                    }).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="mt-5 text-center">
                        <div class="relative inline-block">
                            <svg class="w-24 h-24 transform -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="#e5e7eb" stroke-width="8" fill="none"/>
                                <circle cx="48" cy="48" r="40" stroke="${batteryStatus.color}" stroke-width="8" fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" style="transition: stroke-dashoffset 0.5s ease;"/>
                            </svg>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <span class="text-3xl">${getMoodIcon(checkinData)}</span>
                            </div>
                        </div>
                        <div class="mt-3">
                            <div class="text-2xl font-bold" style="color: ${batteryStatus.color}">${batteryScore}%</div>
                            <div class="text-sm font-medium text-warm-700">${batteryStatus.text}</div>
                            <div class="text-xs text-warm-500 mt-1" style="white-space: pre-line;">${getBatteryAdvice(checkinData)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                    <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                        <span class="material-icons text-orange-500 text-sm">backpack</span>
                        陪护生存包
                    </h3>
                    <div class="grid grid-cols-3 gap-3">
                        ${supportData.survivalKit.map(item => `
                            <div class="bg-warm-50 rounded-xl p-3 text-center">
                                <div class="text-2xl mb-1">${item.icon}</div>
                                <div class="text-xs font-medium text-warm-800">${item.name}</div>
                                <div class="text-xs text-warm-400 mt-0.5">${item.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-white rounded-2xl p-4 card-shadow mb-4">
                    <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                        <span class="material-icons text-purple-500 text-sm">lightbulb</span>
                        减负小技巧
                    </h3>
                    <div class="grid grid-cols-2 gap-3">
                        ${supportData.tips.map(tip => `
                            <div class="bg-warm-50 rounded-xl p-3 text-center">
                                <div class="text-xl mb-2">${tip.icon}</div>
                                <div class="text-sm font-medium text-warm-800">${tip.title}</div>
                                <div class="text-xs text-warm-500 mt-1">${tip.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-white rounded-2xl p-4 card-shadow">
                    <h3 class="font-bold text-warm-800 mb-3 flex items-center gap-2">
                        <span class="material-icons text-primary text-sm">phone</span>
                        求助资源
                    </h3>
                    <div class="space-y-3">
                        ${supportData.resources.map(res => `
                            <div class="bg-warm-50 rounded-xl p-3">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="text-sm font-medium text-warm-800">${res.title}</div>
                                        <div class="text-xs text-warm-500">${res.desc}</div>
                                    </div>
                                    <div class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-lg">${res.phone}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    function setCheckin(itemId, value) {
        const checkinData = Storage.get('caregiverCheckin', {});
        checkinData[itemId] = value;
        Storage.set('caregiverCheckin', checkinData);
        loadSupportContent();
    }

    function setMood(level, icon) {
        const moodDisplay = document.getElementById('mood-display');
        const moodLabel = document.getElementById('mood-label');
        if (moodDisplay) moodDisplay.textContent = icon;
        if (moodLabel) {
            const labels = { 1: '很轻松', 2: '有点累', 3: '比较疲惫', 4: '非常累' };
            moodLabel.textContent = labels[level];
        }
        
        Storage.set('caregiverMood', { level: level, icon: icon, timestamp: Date.now() });
        
        if (level >= 3) {
            UI.showToast('⚠️ 记得多休息，照顾好自己！');
        }
    }

    window.goToPage = goToPage;
    window.goBack = goBack;
    window.selectScenario = selectScenario;
    window.toggleTask = toggleTask;
    window.toggleNightMode = toggleNightMode;
    window.quickRecord = quickRecord;
    window.closeRecord = closeRecord;
    window.saveRecord = saveRecord;
    window.showTrainingDetail = showTrainingDetail;
    window.trainingData = trainingData;
    window.closeTrainingDetail = closeTrainingDetail;
    window.checkQuiz = checkQuiz;
    window.careBackground = careBackground;
    window.editCarePackage = editCarePackage;
    window.saveCarePackage = saveCarePackage;
    window.showEmergency = showEmergency;
    window.saveNursePhone = saveNursePhone;
    window.openAddMedication = openAddMedication;
    window.saveMedication = saveMedication;
    window.updateMedTimes = updateMedTimes;
    window.toggleMedicationTime = toggleMedicationTime;
    window.deleteMedication = deleteMedication;
    window.getMedicationKey = getMedicationKey;
    window.addTodo = addTodo;
    window.editTodo = editTodo;
    window.deleteTodo = deleteTodo;
    window.resetTodos = resetTodos;
    window.refreshTodoPage = refreshTodoPage;

    const stageContent = {
        'day1': { title: '今晚照护路线图', subtitle: '妈妈刚做完手术，这是最关键的24小时', badge: '🌙 住院第1晚 · 术后陪护', focus: ['先做好这3件事'], keyTasks: [{ step: '1', title: '保持引流管通畅', desc: '注意观察引流液颜色和量' }, { step: '2', title: '定时翻身防压疮', desc: '每2小时翻身一次' }, { step: '3', title: '疼痛管理', desc: '疼痛评分超过7分及时告知护士' }], painPoints: ['夜间疼痛加重', '凌晨换液', '睡眠严重不足'] },
        'day2-3': { title: '术后照护路线图', subtitle: '度过关键期，开始逐步恢复', badge: '📅 住院第2-3天 · 稳定期', focus: ['康复训练开始'], keyTasks: [{ step: '1', title: '早期下床活动', desc: '在医生指导下开始下床行走' }, { step: '2', title: '伤口护理', desc: '观察伤口敷料情况' }, { step: '3', title: '饮食调理', desc: '根据医嘱逐步恢复饮食' }], painPoints: ['下床活动困难', '伤口肿胀不适', '排便困难'] },
        'day4-7': { title: '康复照护路线图', subtitle: '逐步恢复，准备出院', badge: '🏥 住院第4-7天 · 康复期', focus: ['出院准备'], keyTasks: [{ step: '1', title: '加强康复训练', desc: '增加活动量进行康复训练' }, { step: '2', title: '准备出院物品', desc: '整理病历资料和用药清单' }, { step: '3', title: '学习居家照护', desc: '向护士学习居家照护技能' }], painPoints: ['康复进展缓慢', '出院焦虑', '照护技能不足'] },
        'day7+': { title: '出院前照护路线图', subtitle: '准备回家，开启居家康复', badge: '🚪 住院第7天+ · 出院前', focus: ['居家准备'], keyTasks: [{ step: '1', title: '居家环境改造', desc: '确保家中无障碍通道' }, { step: '2', title: '复查预约', desc: '预约出院后第一次复查' }, { step: '3', title: '心理准备', desc: '做好长期照护的心理准备' }], painPoints: ['出院后焦虑', '居家照护压力', '康复信心不足'] }
    };
    

    function getStageByDays(days) { const d = parseInt(days) || 1; if (d <= 1) return 'day1'; if (d <= 3) return 'day2-3'; if (d <= 7) return 'day4-7'; return 'day7+'; }
    
    function selectSurgery(type) {
        console.log('selectSurgery called with type:', type);
        document.querySelectorAll('.surgery-btn').forEach(btn => { btn.classList.remove('border-primary', 'bg-primary/5'); btn.classList.add('border-warm-200'); });
        const btn = document.querySelector(`[data-surgery="${type}"]`);
        if (btn) { btn.classList.add('border-primary', 'bg-primary/5'); btn.classList.remove('border-warm-200'); }
        careBackground.surgeryType = type;
        const input = document.getElementById('custom-surgery');
        if (input) { input.value = ''; careBackground.customSurgery = ''; }
    }
    
    function selectDays(days) {
        document.querySelectorAll('.days-btn').forEach(btn => { btn.classList.remove('bg-primary', 'text-white'); btn.classList.add('bg-warm-50', 'border-2', 'border-warm-200', 'text-warm-800'); });
        if (days === 'custom') {
            const customInput = document.getElementById('custom-days-input');
            if (customInput) customInput.classList.remove('hidden');
        } else {
            const customInput = document.getElementById('custom-days-input');
            if (customInput) customInput.classList.add('hidden');
            careBackground.postOpDays = days;
            const btn = document.querySelector(`[data-days="${days}"]`);
            if (btn) { btn.classList.remove('bg-warm-50', 'border-2', 'border-warm-200', 'text-warm-800'); btn.classList.add('bg-primary', 'text-white'); }
        }
        currentStage = getStageByDays(careBackground.postOpDays);
    }
    
    function saveCareBackground() {
        const customDaysInput = document.getElementById('custom-days-value');
        if (customDaysInput && !customDaysInput.parentElement.classList.contains('hidden')) {
            const days = parseInt(customDaysInput.value);
            if (days && days > 0) careBackground.postOpDays = days;
        }
        const customSurgeryInput = document.getElementById('custom-surgery');
        if (customSurgeryInput && customSurgeryInput.value.trim()) {
            careBackground.customSurgery = customSurgeryInput.value.trim();
            careBackground.surgeryType = 'custom';
        }
        Storage.set('careBackground', careBackground);
        currentStage = getStageByDays(careBackground.postOpDays);
        goToPage('roadmap');
        loadScenarioData();
    }
    
    function skipSetup() {
        careBackground.surgeryType = 'general'; careBackground.postOpDays = 1; careBackground.customSurgery = '';
        Storage.set('careBackground', careBackground); currentStage = 'day1'; goToPage('roadmap');
        loadScenarioData();
    }
    
    function setCurrentStage(stage) {
        currentStage = stage;
        const daysMap = { 'day1': 1, 'day2-3': 2, 'day4-7': 4, 'day7+': 8 };
        careBackground.postOpDays = daysMap[stage] || 1;
        Storage.set('careBackground', careBackground);
        loadScenarioData();
    }
    
    function addDailyEvent(eventId) {
        const events = Storage.get('dailyEvents', []);
        if (!events.includes(eventId)) {
            events.push(eventId); Storage.set('dailyEvents', events);
            UI.showToast('事件已记录'); loadScenarioData();
        }
    }
    
    function removeDailyEvent(eventId) {
        const events = Storage.get('dailyEvents', []);
        const index = events.indexOf(eventId);
        if (index > -1) { events.splice(index, 1); Storage.set('dailyEvents', events); loadScenarioData(); }
    }
    
    function resetAllData() {
        if (confirm('确定要重置所有数据吗？')) {
            localStorage.clear();
            careBackground.surgeryType = ''; careBackground.postOpDays = 1; careBackground.customSurgery = '';
            currentStage = 'day1'; currentScenario = 'post-op-night';
            goToPage('home'); UI.showToast('数据已重置');
        }
    }
    
    const dailyEvents = [
        { id: 'medication', icon: '💊', label: '换药/输液', desc: '今天有换药或输液' },
        { id: 'examination', icon: '📋', label: '检查', desc: '今天做了检查' },
        { id: 'pain', icon: '😣', label: '疼痛加重', desc: '妈妈今天疼痛比平时明显' },
        { id: 'fever', icon: '🌡️', label: '发烧', desc: '妈妈今天有发烧' },
        { id: 'appetite', icon: '🍽️', label: '食欲差', desc: '妈妈今天吃不下东西' },
        { id: 'mood', icon: '😔', label: '情绪低落', desc: '妈妈今天情绪不太好' }
    ];
    
    window.setMood = setMood;
    window.setCheckin = setCheckin;
    window.showMicroTraining = showMicroTraining;
    window.closeMicroTraining = closeMicroTraining;
    window.checkMicroTraining = checkMicroTraining;
    window.saveHandoverNote = saveHandoverNote;
    window.selectSurgery = selectSurgery;
    window.selectDays = selectDays;
    window.saveCareBackground = saveCareBackground;
    window.skipSetup = skipSetup;
    window.setCurrentStage = setCurrentStage;
    window.addDailyEvent = addDailyEvent;
    window.removeDailyEvent = removeDailyEvent;
    window.resetAllData = resetAllData;

    init();
})();

function checkMultiQuiz(qIdx, selected, correct, trainingId) {
    const quizResult = document.getElementById('quiz-result-' + qIdx);
    const buttons = document.querySelectorAll('#quiz-' + qIdx + ' button');
    buttons.forEach(function(btn, idx) {
        btn.disabled = true;
        if (idx === correct) {
            btn.classList.add('bg-green-100', 'border-green-500', 'text-green-700');
            btn.classList.remove('bg-white', 'border-gray-200', 'text-warm-600');
        } else if (idx === selected && idx !== correct) {
            btn.classList.add('bg-red-100', 'border-red-500', 'text-red-700');
            btn.classList.remove('bg-white', 'border-gray-200', 'text-warm-600');
        }
    });
    if (selected === correct) {
        quizResult.innerHTML = '✅ 回答正确！';
        quizResult.className = 'mt-3 text-sm text-green-600';
    } else {
        quizResult.innerHTML = '❌ 回答错误，请再仔细看看图解步骤。';
        quizResult.className = 'mt-3 text-sm text-red-600';
    }
    quizResult.classList.remove('hidden');
    const data = trainingData[trainingId];
    if (qIdx < data.quiz.length - 1) {
        setTimeout(function() {
            document.getElementById('quiz-' + qIdx).classList.add('hidden');
            document.getElementById('quiz-' + (qIdx + 1)).classList.remove('hidden');
        }, 1500);
    } else {
        setTimeout(function() {
            document.getElementById('quiz-container').innerHTML = '<div class="text-center py-6"><div class="text-4xl mb-3">🎉</div><h4 class="font-semibold text-warm-800 mb-2">恭喜完成测验！</h4><p class="text-sm text-warm-500">你已经掌握了术后翻身的技巧</p></div>';
        }, 1500);
    }
}       quizResult.className = 'mt-3 text-sm text-red-600';
