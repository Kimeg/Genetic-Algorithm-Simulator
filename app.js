(() => {
    // ---------- Configuration ----------
    const POP = 200, ELITE = 2, TOURN = 3;
    const PAL = [[20, 24, 50], [239, 71, 111], [255, 209, 102], [6, 214, 160], [17, 138, 178], [245, 245, 250], [255, 140, 50], [122, 76, 44], [140, 90, 200], [255, 150, 200]];
    let K = PAL.length;
    let W = 24, N = W * W, MUT = 1.5 / N, mode = '2d', D = 12, sparse = false;
    // ---------- Models: fn(u,v,x,y) with u,v in (0,1) => palette index; size independent ----------
    const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);
    const MODELS = {
        heart: (u, v) => {
            const nx = (u - .5) * 2.1, ny = -(v - .52) * 2.1;
            const f = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny;
            if (f > 0)
                return 0;
            if (nx < -.35 && nx > -.7 && ny > .3)
                return 5;
            return f > -.12 ? 3 : 1;
        },
        smiley: (u, v) => {
            const dx = u - .5, dy = v - .5, d = Math.hypot(dx, dy);
            if (d > .44)
                return 0;
            if (d > .375)
                return 6;
            if (Math.hypot(u - .34, v - .38) < .07 || Math.hypot(u - .66, v - .38) < .07)
                return 7;
            if (dy > .08 && d > .23 && d < .3)
                return 1;
            return 2;
        },
        tree: (u, v) => {
            if (v > .8 && v < .96 && Math.abs(u - .5) < .08)
                return 7;
            for (let i = 0; i < 3; i++) {
                const top = .06 + i * .25;
                if (v >= top && v < top + .32 && Math.abs(u - .5) <= (v - top) * .55 + .03)
                    return ((Math.floor(u * 40) * 7 + Math.floor(v * 40) * 3) % 11 === 0) ? 1 : 3;
            }
            return v > .96 ? 5 : 0;
        },
        invader: (u, v) => {
            const R = ["..#.....#..", "...#...#...", "..#######..", ".##.###.##.", "###########", "#.#######.#", "#.#.....#.#", "...##.##..."];
            const gx = Math.floor((u - .05) / .9 * 11), gy = Math.floor((v - .2) / .6 * 8);
            if (u < .05 || u >= .95 || v < .2 || v >= .8 || R[gy][gx] !== '#')
                return 0;
            return gy >= 6 ? 2 : (gy === 3 && (gx === 3 || gx === 7)) ? 1 : 3;
        },
        sunset: (u, v) => {
            const h = .66 + .1 * Math.sin(u * 9) + .06 * Math.sin(u * 23 + 1);
            if (v > .9)
                return 0;
            if (v > h)
                return 4;
            if (Math.hypot(u - .5, v - .58) < .14)
                return 2;
            return v < .2 ? 8 : v < .38 ? 9 : v < .52 ? 6 : 2;
        },
        planet: (u, v, x, y) => {
            const dx = u - .5, dy = v - .5, d = Math.hypot(dx, dy);
            const ring = Math.abs(Math.hypot(dx, dy * 3.2) - .42) < .05;
            if (d < .27) {
                if (ring && dy > 0)
                    return 8;
                const b = Math.floor((v - .2) * 16) % 4;
                return [6, 2, 7, 6][(b + 4) % 4];
            }
            if (ring)
                return 8;
            return hash(x, y) % 29 === 0 ? 5 : 0;
        },
        mushroom: (u, v) => {
            const dx = u - .5;
            if (v > .88)
                return 3;
            if (v > .5 && v < .88 && Math.abs(dx) < .1 + .04 * (v - .5))
                return 5;
            const cy = (v - .52) / .38;
            if (v <= .52 && dx * dx / .2 + cy * cy < 1.0 && v > .12) {
                if (Math.hypot(u - .36, v - .32) < .07 || Math.hypot(u - .62, v - .26) < .06 || Math.hypot(u - .5, v - .44) < .05)
                    return 5;
                return 1;
            }
            return 4;
        },
        flower: (u, v) => {
            const dx = u - .5, dy = v - .42, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
            if (r < .1)
                return 2;
            if (r < .36 * (.62 + .38 * Math.cos(5 * th)))
                return r < .2 ? 9 : 1;
            if (v > .58 && Math.abs(dx - .03 * Math.sin(v * 9)) < .025)
                return 3;
            if (v > .72 && v < .82 && dx > 0 && dx < .2 + (.82 - v) * 0)
                return 3;
            return v > .92 ? 7 : 4;
        },
        rainbow: (u, v) => {
            const d = Math.hypot(u - .5, v - .95);
            if (v > .88 && Math.abs(u - .5) > .4)
                return 3;
            const bands = [1, 6, 2, 3, 4, 8];
            const i = Math.floor((d - .2) / .045);
            if (d >= .2 && i < 6 && v < .95)
                return bands[i];
            if (Math.hypot(u - .2, v - .6) < .07 || Math.hypot(u - .27, v - .57) < .06 || Math.hypot(u - .78, v - .35) < .07 || Math.hypot(u - .85, v - .38) < .05)
                return 5;
            return 0;
        }
    };
    const build = name => { const t = new Uint8Array(N); for (let y = 0; y < W; y++)
        for (let x = 0; x < W; x++)
            t[y * W + x] = MODELS[name]((x + .5) / W, (y + .5) / W, x, y); return t; };
    // ---------- Text models ----------
    const LANGS = [['en', 'English'], ['de', 'Deutsch'], ['es', 'Español'], ['fr', 'Français'], ['ru', 'Русский'], ['ko', '한국어'], ['ja', '日本語'], ['zh', '中文'], ['ar', 'العربية'], ['th', 'ไทย']];
    // 20 phrases per language: 4 each of 1, 2, 3, 4 and 5 sentences
    const TEXTS = {
        en: ["Hello World.", "Evolution wins.", "The sun is shining today.", "Never stop learning.",
            "Good morning. How are you?", "Nature finds a way. Life always adapts.", "I love music. It makes me happy.", "The cat is sleeping. Please be quiet.",
            "Genes carry information. Mutations create variety. Selection keeps the best.", "The train is late. I will wait here. Please call me soon.", "Spring has come. The flowers are blooming. Birds sing in the trees.", "Water is essential. Drink it every day. Your body will thank you.",
            "Computers can learn. They try many solutions. The best ones survive. Over time they improve.", "I went to the market. I bought fresh bread. Then I met an old friend. We talked for an hour.", "The mountain is high. The air is cold. We walk slowly. The view is wonderful.", "Reading opens the mind. Every book is a new world. Take your time. Enjoy each page.",
            "Every species starts with random traits. Some traits help survival. Those individuals have more offspring. Their genes spread through the population. After many generations, evolution finds a solution.", "Yesterday was a long day. I woke up early and went to work. The meeting lasted three hours. In the evening I cooked dinner. Finally, I went to sleep.", "The sea is calm tonight. The moon shines above the waves. A gentle wind blows from the south. Fishermen return to the harbor. Everything feels peaceful.", "Learning a language takes time. Practice a little every day. Do not be afraid of mistakes. Talk with native speakers. Soon you will be fluent."],
        de: ["Hallo Welt.", "Die Evolution gewinnt.", "Heute scheint die Sonne.", "Hör nie auf zu lernen.",
            "Guten Morgen. Wie geht es dir?", "Die Natur findet einen Weg. Das Leben passt sich immer an.", "Ich liebe Musik. Sie macht mich glücklich.", "Die Katze schläft. Bitte sei leise.",
            "Gene tragen Informationen. Mutationen schaffen Vielfalt. Die Selektion bewahrt das Beste.", "Der Zug hat Verspätung. Ich warte hier. Bitte ruf mich bald an.", "Der Frühling ist da. Die Blumen blühen. Vögel singen in den Bäumen.", "Wasser ist lebenswichtig. Trink es jeden Tag. Dein Körper wird es dir danken.",
            "Computer können lernen. Sie probieren viele Lösungen aus. Die besten überleben. Mit der Zeit werden sie besser.", "Ich ging zum Markt. Ich kaufte frisches Brot. Dann traf ich einen alten Freund. Wir redeten eine Stunde lang.", "Der Berg ist hoch. Die Luft ist kalt. Wir gehen langsam. Die Aussicht ist wunderbar.", "Lesen öffnet den Geist. Jedes Buch ist eine neue Welt. Nimm dir Zeit. Genieße jede Seite.",
            "Jede Art beginnt mit zufälligen Merkmalen. Manche Merkmale helfen beim Überleben. Diese Individuen haben mehr Nachkommen. Ihre Gene verbreiten sich in der Population. Nach vielen Generationen findet die Evolution eine Lösung.", "Gestern war ein langer Tag. Ich stand früh auf und ging zur Arbeit. Die Besprechung dauerte drei Stunden. Am Abend kochte ich das Abendessen. Schließlich ging ich schlafen.", "Das Meer ist heute Nacht ruhig. Der Mond scheint über den Wellen. Ein sanfter Wind weht aus dem Süden. Die Fischer kehren in den Hafen zurück. Alles fühlt sich friedlich an.", "Eine Sprache zu lernen braucht Zeit. Übe jeden Tag ein wenig. Habe keine Angst vor Fehlern. Sprich mit Muttersprachlern. Bald sprichst du fließend."],
        es: ["Hola mundo.", "La evolución gana.", "Hoy brilla el sol.", "Nunca dejes de aprender.",
            "Buenos días. ¿Cómo estás?", "La naturaleza encuentra un camino. La vida siempre se adapta.", "Me encanta la música. Me hace feliz.", "El gato está durmiendo. Por favor, haz silencio.",
            "Los genes llevan información. Las mutaciones crean variedad. La selección conserva lo mejor.", "El tren llega tarde. Esperaré aquí. Por favor, llámame pronto.", "Ha llegado la primavera. Las flores están floreciendo. Los pájaros cantan en los árboles.", "El agua es esencial. Bébela todos los días. Tu cuerpo te lo agradecerá.",
            "Los ordenadores pueden aprender. Prueban muchas soluciones. Las mejores sobreviven. Con el tiempo mejoran.", "Fui al mercado. Compré pan fresco. Luego encontré a un viejo amigo. Hablamos durante una hora.", "La montaña es alta. El aire es frío. Caminamos despacio. La vista es maravillosa.", "Leer abre la mente. Cada libro es un mundo nuevo. Tómate tu tiempo. Disfruta cada página.",
            "Cada especie empieza con rasgos aleatorios. Algunos rasgos ayudan a sobrevivir. Esos individuos tienen más descendencia. Sus genes se extienden por la población. Después de muchas generaciones, la evolución encuentra una solución.", "Ayer fue un día largo. Me desperté temprano y fui al trabajo. La reunión duró tres horas. Por la noche preparé la cena. Por fin me fui a dormir.", "El mar está tranquilo esta noche. La luna brilla sobre las olas. Sopla un viento suave del sur. Los pescadores vuelven al puerto. Todo parece en paz.", "Aprender un idioma lleva tiempo. Practica un poco cada día. No tengas miedo de cometer errores. Habla con hablantes nativos. Pronto hablarás con fluidez."],
        fr: ["Bonjour le monde.", "L'évolution gagne.", "Le soleil brille aujourd'hui.", "N'arrête jamais d'apprendre.",
            "Bonjour. Comment vas-tu ?", "La nature trouve un chemin. La vie s'adapte toujours.", "J'adore la musique. Elle me rend heureux.", "Le chat dort. Sois silencieux, s'il te plaît.",
            "Les gènes portent l'information. Les mutations créent la diversité. La sélection garde les meilleurs.", "Le train est en retard. J'attendrai ici. Appelle-moi bientôt, s'il te plaît.", "Le printemps est arrivé. Les fleurs s'épanouissent. Les oiseaux chantent dans les arbres.", "L'eau est essentielle. Bois-en chaque jour. Ton corps te remerciera.",
            "Les ordinateurs peuvent apprendre. Ils essaient de nombreuses solutions. Les meilleures survivent. Avec le temps, elles s'améliorent.", "Je suis allé au marché. J'ai acheté du pain frais. Puis j'ai rencontré un vieil ami. Nous avons parlé pendant une heure.", "La montagne est haute. L'air est froid. Nous marchons lentement. La vue est magnifique.", "Lire ouvre l'esprit. Chaque livre est un monde nouveau. Prends ton temps. Savoure chaque page.",
            "Chaque espèce commence avec des traits aléatoires. Certains traits aident à survivre. Ces individus ont plus de descendants. Leurs gènes se répandent dans la population. Après de nombreuses générations, l'évolution trouve une solution.", "Hier était une longue journée. Je me suis levé tôt et je suis allé travailler. La réunion a duré trois heures. Le soir, j'ai préparé le dîner. Enfin, je suis allé me coucher.", "La mer est calme ce soir. La lune brille au-dessus des vagues. Un vent doux souffle du sud. Les pêcheurs rentrent au port. Tout semble paisible.", "Apprendre une langue demande du temps. Pratique un peu chaque jour. N'aie pas peur des erreurs. Parle avec des locuteurs natifs. Bientôt, tu seras à l'aise."],
        ru: ["Привет, мир.", "Эволюция побеждает.", "Сегодня светит солнце.", "Никогда не переставай учиться.",
            "Доброе утро. Как дела?", "Природа находит путь. Жизнь всегда приспосабливается.", "Я люблю музыку. Она делает меня счастливым.", "Кошка спит. Пожалуйста, потише.",
            "Гены несут информацию. Мутации создают разнообразие. Отбор сохраняет лучших.", "Поезд опаздывает. Я подожду здесь. Пожалуйста, позвони мне скоро.", "Пришла весна. Цветы распускаются. Птицы поют на деревьях.", "Вода необходима. Пей её каждый день. Твоё тело скажет спасибо.",
            "Компьютеры могут учиться. Они пробуют много решений. Лучшие выживают. Со временем они улучшаются.", "Я пошёл на рынок. Я купил свежий хлеб. Потом я встретил старого друга. Мы разговаривали целый час.", "Гора высокая. Воздух холодный. Мы идём медленно. Вид прекрасный.", "Чтение открывает разум. Каждая книга — новый мир. Не торопись. Наслаждайся каждой страницей.",
            "Каждый вид начинается со случайных признаков. Некоторые признаки помогают выжить. У таких особей больше потомства. Их гены распространяются в популяции. Через много поколений эволюция находит решение.", "Вчера был длинный день. Я рано встал и пошёл на работу. Совещание длилось три часа. Вечером я приготовил ужин. Наконец я лёг спать.", "Сегодня ночью море спокойно. Луна светит над волнами. С юга дует лёгкий ветер. Рыбаки возвращаются в гавань. Всё кажется мирным.", "Изучение языка требует времени. Немного практикуйся каждый день. Не бойся ошибок. Общайся с носителями языка. Скоро ты заговоришь свободно."],
        ko: ["안녕하세요, 세계.", "진화가 승리한다.", "오늘은 해가 비친다.", "배움을 멈추지 마세요.",
            "좋은 아침입니다. 잘 지내세요?", "자연은 길을 찾는다. 생명은 항상 적응한다.", "나는 음악을 좋아해요. 음악은 나를 행복하게 해요.", "고양이가 자고 있어요. 조용히 해 주세요.",
            "유전자는 정보를 담고 있다. 돌연변이는 다양성을 만든다. 선택은 최고를 남긴다.", "기차가 늦어요. 여기서 기다릴게요. 곧 전화해 주세요.", "봄이 왔어요. 꽃이 피고 있어요. 새들이 나무에서 노래해요.", "물은 꼭 필요해요. 매일 마시세요. 몸이 고마워할 거예요.",
            "컴퓨터는 학습할 수 있다. 여러 해법을 시도한다. 가장 좋은 것이 살아남는다. 시간이 지나면 나아진다.", "시장에 갔어요. 신선한 빵을 샀어요. 그리고 옛 친구를 만났어요. 우리는 한 시간 동안 이야기했어요.", "산이 높아요. 공기가 차가워요. 우리는 천천히 걸어요. 경치가 정말 멋져요.", "독서는 마음을 열어 준다. 모든 책은 새로운 세계다. 천천히 하세요. 한 장 한 장 즐기세요.",
            "모든 종은 무작위 형질로 시작한다. 어떤 형질은 생존에 도움이 된다. 그런 개체는 자손이 더 많다. 그들의 유전자는 집단에 퍼진다. 많은 세대 후에 진화는 해답을 찾는다.", "어제는 긴 하루였어요. 일찍 일어나 출근했어요. 회의는 세 시간 동안 이어졌어요. 저녁에는 저녁밥을 지었어요. 마침내 잠자리에 들었어요.", "오늘 밤 바다는 잔잔해요. 달이 파도 위에서 빛나요. 남쪽에서 부드러운 바람이 불어요. 어부들이 항구로 돌아와요. 모든 것이 평화롭게 느껴져요.", "언어를 배우려면 시간이 걸려요. 매일 조금씩 연습하세요. 실수를 두려워하지 마세요. 원어민과 이야기해 보세요. 곧 유창해질 거예요."],
        ja: ["こんにちは、世界。", "進化は勝つ。", "今日は太陽が輝いています。", "学び続けましょう。",
            "おはようございます。お元気ですか。", "自然は道を見つける。命はいつも適応する。", "私は音楽が好きです。音楽は私を幸せにします。", "猫が寝ています。静かにしてください。",
            "遺伝子は情報を運ぶ。突然変異は多様性を生む。選択は最良のものを残す。", "電車が遅れています。ここで待ちます。すぐに電話してください。", "春が来ました。花が咲いています。鳥が木で歌っています。", "水は欠かせません。毎日飲みましょう。体が喜びます。",
            "コンピュータは学習できる。多くの解を試す。最良のものが生き残る。時間とともに改善する。", "市場へ行きました。新鮮なパンを買いました。それから旧友に会いました。一時間ほど話しました。", "山は高いです。空気は冷たいです。私たちはゆっくり歩きます。景色がすばらしいです。", "読書は心を開く。どの本も新しい世界だ。ゆっくりでいい。一ページずつ楽しもう。",
            "すべての種はランダムな形質から始まる。ある形質は生存に役立つ。そのような個体は子孫が多い。その遺伝子は集団に広がる。多くの世代を経て、進化は解を見つける。", "昨日は長い一日でした。早く起きて仕事に行きました。会議は三時間続きました。夜は夕食を作りました。ようやく眠りました。", "今夜の海は穏やかです。月が波の上で輝いています。南からやさしい風が吹いています。漁師たちが港に戻ります。すべてが平和に感じられます。", "言語を学ぶには時間がかかります。毎日少しずつ練習しましょう。間違いを恐れないでください。母語話者と話しましょう。すぐに流暢になります。"],
        zh: ["你好，世界。", "进化获胜。", "今天阳光明媚。", "永远不要停止学习。",
            "早上好。你好吗？", "自然总能找到出路。生命总会适应。", "我喜欢音乐。它让我快乐。", "猫在睡觉。请保持安静。",
            "基因携带信息。突变创造多样性。选择保留最优者。", "火车晚点了。我在这里等。请尽快给我打电话。", "春天来了。花儿盛开。鸟儿在树上歌唱。", "水是必需的。每天都要喝。你的身体会感谢你。",
            "计算机可以学习。它们尝试许多方案。最好的得以生存。随着时间推移它们不断改进。", "我去了市场。我买了新鲜的面包。然后我遇到了一位老朋友。我们聊了一个小时。", "山很高。空气很冷。我们慢慢地走。风景太美了。", "阅读开启心智。每本书都是一个新世界。慢慢来。享受每一页。",
            "每个物种都从随机的特征开始。有些特征有助于生存。这些个体有更多后代。它们的基因在种群中扩散。经过许多代，进化找到了答案。", "昨天是漫长的一天。我很早起床去上班。会议持续了三个小时。晚上我做了晚饭。最后我去睡觉了。", "今晚的大海很平静。月亮照在波浪上。南风轻轻吹来。渔民们回到港口。一切都显得宁静。", "学习一门语言需要时间。每天练习一点。不要害怕犯错。多和母语者交流。你很快就会流利。"],
        ar: ["مرحبا بالعالم.", "التطور ينتصر.", "الشمس مشرقة اليوم.", "لا تتوقف أبدا عن التعلم.",
            "صباح الخير. كيف حالك؟", "الطبيعة تجد طريقها. الحياة تتكيف دائما.", "أحب الموسيقى. إنها تسعدني.", "القطة نائمة. من فضلك كن هادئا.",
            "الجينات تحمل المعلومات. الطفرات تصنع التنوع. الانتقاء يحفظ الأفضل.", "القطار متأخر. سأنتظر هنا. اتصل بي قريبا من فضلك.", "جاء الربيع. الزهور تتفتح. الطيور تغني على الأشجار.", "الماء ضروري. اشربه كل يوم. جسمك سيشكرك.",
            "الحواسيب تستطيع أن تتعلم. تجرب حلولا كثيرة. الأفضل منها يبقى. ومع الوقت تتحسن.", "ذهبت إلى السوق. اشتريت خبزا طازجا. ثم قابلت صديقا قديما. تحدثنا لمدة ساعة.", "الجبل عال. الهواء بارد. نمشي ببطء. المنظر رائع.", "القراءة تفتح العقل. كل كتاب عالم جديد. خذ وقتك. استمتع بكل صفحة.",
            "كل نوع يبدأ بصفات عشوائية. بعض الصفات تساعد على البقاء. هؤلاء الأفراد لديهم نسل أكثر. تنتشر جيناتهم في المجتمع. وبعد أجيال كثيرة يجد التطور حلا.", "كان أمس يوما طويلا. استيقظت مبكرا وذهبت إلى العمل. استمر الاجتماع ثلاث ساعات. في المساء طبخت العشاء. وأخيرا ذهبت إلى النوم.", "البحر هادئ الليلة. القمر يلمع فوق الأمواج. تهب ريح لطيفة من الجنوب. يعود الصيادون إلى الميناء. كل شيء يبدو هادئا.", "تعلم لغة يحتاج إلى وقت. تدرب قليلا كل يوم. لا تخف من الأخطاء. تحدث مع الناطقين بها. قريبا ستتقنها."],
        th: ["สวัสดีชาวโลก", "วิวัฒนาการเป็นผู้ชนะ", "วันนี้แดดสดใส", "อย่าหยุดเรียนรู้",
            "อรุณสวัสดิ์ สบายดีไหม", "ธรรมชาติหาทางออกเสมอ ชีวิตปรับตัวได้เสมอ", "ฉันรักดนตรี ดนตรีทำให้ฉันมีความสุข", "แมวกำลังนอนหลับ กรุณาเงียบ ๆ",
            "ยีนเก็บข้อมูล การกลายพันธุ์สร้างความหลากหลาย การคัดเลือกเก็บสิ่งที่ดีที่สุดไว้", "รถไฟมาช้า ฉันจะรออยู่ที่นี่ โปรดโทรหาฉันเร็ว ๆ นี้", "ฤดูใบไม้ผลิมาถึงแล้ว ดอกไม้กำลังบาน นกร้องเพลงบนต้นไม้", "น้ำจำเป็นมาก ดื่มทุกวัน ร่างกายจะขอบคุณคุณ",
            "คอมพิวเตอร์เรียนรู้ได้ มันลองหลายวิธี วิธีที่ดีที่สุดอยู่รอด เมื่อเวลาผ่านไปก็ดีขึ้น", "ฉันไปตลาด ฉันซื้อขนมปังสด แล้วฉันก็พบเพื่อนเก่า เราคุยกันหนึ่งชั่วโมง", "ภูเขาสูง อากาศหนาว เราเดินช้า ๆ ทิวทัศน์งดงามมาก", "การอ่านเปิดใจ หนังสือทุกเล่มคือโลกใบใหม่ ค่อย ๆ อ่าน เพลิดเพลินทุกหน้า",
            "ทุกสายพันธุ์เริ่มจากลักษณะแบบสุ่ม บางลักษณะช่วยให้อยู่รอด ตัวที่มีลักษณะเหล่านั้นมีลูกหลานมากกว่า ยีนของมันแพร่กระจายในประชากร หลายชั่วอายุคนต่อมา วิวัฒนาการก็พบคำตอบ", "เมื่อวานเป็นวันที่ยาวนาน ฉันตื่นเช้าและไปทำงาน การประชุมใช้เวลาสามชั่วโมง ตอนเย็นฉันทำอาหารเย็น ในที่สุดฉันก็เข้านอน", "คืนนี้ทะเลสงบ พระจันทร์ส่องเหนือคลื่น ลมเบา ๆ พัดมาจากทิศใต้ ชาวประมงกลับเข้าท่าเรือ ทุกอย่างดูสงบสุข", "การเรียนภาษาต้องใช้เวลา ฝึกทีละนิดทุกวัน อย่ากลัวความผิดพลาด คุยกับเจ้าของภาษา ไม่นานคุณก็จะคล่อง"]
    };
    function fillPhrases() {
        const L = $('lang');
        if (!L.options.length)
            L.innerHTML = LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join('');
        $('phrase').innerHTML = TEXTS[L.value].map((t, i) => {
            const c = Array.from(t), n = t.split(/[.?!。？！؟]/).filter(x => x.trim()).length || 1;
            return `<option value="${i}">${i + 1}. ${c.slice(0, 22).join('')}${c.length > 22 ? '…' : ''}</option>`;
        }).join('');
    }
    // shrink text until both boxes fit (boxes have a fixed height, so the page never overflows the screen)
    function fitText() {
        if (mode !== 'text')
            return;
        const t = $('tTxt'), b = $('bTxt');
        let z = 40;
        for (; z > 9; z--) {
            t.style.fontSize = b.style.fontSize = z + 'px';
            if (t.scrollHeight <= t.clientHeight && b.scrollHeight <= b.clientHeight)
                break;
        }
        t.style.fontSize = b.style.fontSize = Math.max(9, Math.floor(z * .92)) + 'px';
    }
    addEventListener('resize', () => fitText());
    // Plain-text mode: genome = array of alphabet indices (one per character), no pixel rendering.
    const R = (a, b) => { let t = ''; for (let c = a; c <= b; c++)
        t += String.fromCharCode(c); return t; };
    const LAT = R(65, 90) + R(97, 122);
    const EXTRA = { en: LAT, de: LAT + 'ÄÖÜäöüß', es: LAT + 'áéíóúñüÁÉÍÓÚÑ¿¡', fr: LAT + 'àâçéèêëîïôùûüœÀÉÈÊÇ', ru: R(0x410, 0x44F) + 'Ёё',
        ko: '가나다라마바사아자차카타파하', ja: R(0x3041, 0x3093) + R(0x30A1, 0x30F6),
        zh: '我你他的是不了人有这中大为上个国们来到时要就出会可对生能而子那得于着下自之年过发后作里',
        ar: R(0x621, 0x64A), th: R(0x0E01, 0x0E2E) + R(0x0E30, 0x0E3A) + R(0x0E40, 0x0E4E) };
    let alpha = [], lastHtml = '';
    const makeAlphabet = l => [...new Set(Array.from(EXTRA[l] + ' ,!.?' + TEXTS[l].join('')))];
    // ---------- 3D voxel models: fn(x,y,z) in [-1,1], y up; returns palette index (0 = empty) ----------
    const hyp = Math.hypot;
    const MODELS3 = {
        sphere: (x, y, z) => hyp(x, y, z) < .9 ? [4, 3, 2, 6, 1][Math.min(4, Math.floor((y + 1) * 2.5))] : 0,
        pyramid: (x, y, z) => { const h = (y + 1) / 2; return Math.max(Math.abs(x), Math.abs(z)) < .95 * (1 - h) ? (h < .33 ? 2 : h < .66 ? 6 : 1) : 0; },
        torus: (x, y, z) => { const q = hyp(x, z) - .6; return q * q + y * y < .08 ? 1 + Math.floor((Math.atan2(z, x) + Math.PI) / (2 * Math.PI) * 6) % 6 : 0; },
        tree: (x, y, z) => {
            if (y < -.2 && y > -.95 && hyp(x, z) < .14)
                return 7;
            if (y > -.4 && y < .95 && hyp(x, z) < (.95 - y) * .55)
                return Math.sin(x * 23 + y * 31 + z * 17) > .96 ? 1 : 3;
            return 0;
        },
        castle: (x, y, z) => {
            const m = Math.max(Math.abs(x), Math.abs(z));
            for (const a of [-.7, .7])
                for (const b of [-.7, .7]) {
                    const r = hyp(x - a, z - b);
                    if (y > -.9 && y < .35 && r < .22)
                        return 5;
                    if (y >= .35 && y < .8 && r < (.8 - y) * .5)
                        return 1;
                }
            if (y > -.9 && y < -.05 && m < .8 && m > .62)
                return (y > -.2 && Math.floor((x + z + 2) * 5) % 2) ? 0 : 8;
            return 0;
        },
        mushroom: (x, y, z) => {
            if (y < 0 && y > -.9 && hyp(x, z) < .2)
                return 5;
            if (y >= 0 && x * x + y * y * 1.2 + z * z < .64)
                return Math.sin(x * 19 + y * 13 + z * 23) > .9 ? 5 : 1;
            return 0;
        },
        helix: (x, y, z) => {
            const t = y * Math.PI * 3, c = Math.cos(t), s = Math.sin(t);
            if (hyp(x - .5 * c, z - .5 * s) < .17)
                return 4;
            if (hyp(x + .5 * c, z + .5 * s) < .17)
                return 1;
            if (Math.floor((y + 1) * 5.5) % 2 === 0 && Math.abs(z * c - x * s) < .07 && hyp(x, z) < .5)
                return 5;
            return 0;
        }
    };
    function build3(name) {
        const t = new Uint8Array(N), f = MODELS3[name];
        for (let z = 0, i = 0; z < D; z++)
            for (let y = 0; y < D; y++)
                for (let x = 0; x < D; x++, i++)
                    t[i] = f((x + .5) / D * 2 - 1, (y + .5) / D * 2 - 1, (z + .5) / D * 2 - 1);
        return t;
    }
    // ---------- 3D camera + WebGL cube renderer ----------
    // Each occupied voxel is a real cube. Exposed faces are sent through a
    // vertex/fragment shader with directional diffuse light, ambient fill,
    // specular highlights, subtle face variation, and a soft fog falloff.
    const cam = { x: 0, y: 0, z: 0, yaw: 0, pit: .2 }, keys = new Set();
    // Winding order verified in NDC space (after projection + perspective divide):
    // In NDC (+X right, +Y up, +Z into screen), front-facing triangles wind CW.
    const cubeFaces = [
        { n:[ 1,0,0], v:[[ .5,-.5,-.5],[ .5, .5,-.5],[ .5, .5, .5],[ .5,-.5, .5]] }, // +X
        { n:[-1,0,0], v:[[-.5,-.5, .5],[-.5, .5, .5],[-.5, .5,-.5],[-.5,-.5,-.5]] }, // -X
        { n:[0, 1,0], v:[[-.5, .5,-.5],[-.5, .5, .5],[ .5, .5, .5],[ .5, .5,-.5]] }, // +Y
        { n:[0,-1,0], v:[[-.5,-.5, .5],[-.5,-.5,-.5],[ .5,-.5,-.5],[ .5,-.5, .5]] }, // -Y
        { n:[0,0, 1], v:[[ .5,-.5, .5],[ .5, .5, .5],[-.5, .5, .5],[-.5,-.5, .5]] }, // +Z
        { n:[0,0,-1], v:[[-.5,-.5,-.5],[-.5, .5,-.5],[ .5, .5,-.5],[ .5,-.5,-.5]] }  // -Z
    ];
    const faceIndices = [0,1,2,0,2,3];
    let camDirty = true, lastCam = performance.now(), glRenderers = {};
    function resetCam() { cam.x = 0; cam.y = D * .35; cam.z = -D * 1.7; cam.yaw = 0; cam.pit = .2; camDirty = true; }
    function moveCam(now) {
        const dt = Math.min(.05, (now - lastCam) / 1000);
        lastCam = now;
        if (mode !== '3d' || !keys.size) return;
        const sp = D * .9 * dt, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pit), sp2 = Math.sin(cam.pit);
        let f = 0, r = 0, u = 0;
        if (keys.has('w')) f++;
        if (keys.has('s')) f--;
        if (keys.has('d')) r++;
        if (keys.has('a')) r--;
        if (keys.has(' ')) u++;
        if (keys.has('shift')) u--;
        cam.x += (sy * cp * f + cy * r) * sp;
        cam.y += (-sp2 * f + u) * sp;
        cam.z += (cy * cp * f - sy * r) * sp;
        camDirty = true;
    }
    const vertexShader = `#version 300 es
        in vec4 aClip; in vec3 aNormal; in vec3 aColor; in float aAO;
        out vec3 vNormal; out vec3 vColor; out float vAO; out float vDepth;
        void main(){ gl_Position=aClip; vNormal=aNormal; vColor=aColor; vAO=aAO; vDepth=aClip.w; }`;
    const fragmentShader = `#version 300 es
        precision highp float;
        in vec3 vNormal; in vec3 vColor; in float vAO; in float vDepth;
        out vec4 outColor;
        void main(){
          vec3 n=normalize(vNormal); vec3 lightDir=normalize(vec3(-0.45,0.82,-0.62));
          float diffuse=max(dot(n,lightDir),0.0);
          float hemi=0.34+0.22*max(n.y,0.0);
          vec3 viewDir=normalize(vec3(0.0,0.0,-1.0));
          vec3 halfDir=normalize(lightDir+viewDir);
          float spec=pow(max(dot(n,halfDir),0.0),34.0)*0.24;
          vec3 lit=vColor*(hemi+diffuse*0.72)*vAO+vec3(spec);
          float fog=smoothstep(30.0,85.0,vDepth);
          vec3 bg=vec3(0.035,0.045,0.09);
          outColor=vec4(mix(lit,bg,fog*0.42),1.0);
        }`;
    function compileShader(gl, type, source) {
        const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
    }
    function createGLRenderer(canvas) {
        const gl=canvas.getContext('webgl2',{antialias:true,alpha:false});
        if(!gl) throw new Error('WebGL 2 is not available in this browser.');
        const program=gl.createProgram();
        gl.attachShader(program,compileShader(gl,gl.VERTEX_SHADER,vertexShader));
        gl.attachShader(program,compileShader(gl,gl.FRAGMENT_SHADER,fragmentShader));
        gl.linkProgram(program);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
        const vao=gl.createVertexArray(), buffer=gl.createBuffer();
        gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        const stride=11*4;
        for(const [name,size,offset] of [['aClip',4,0],['aNormal',3,16],['aColor',3,28],['aAO',1,40]]){
            const loc=gl.getAttribLocation(program,name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,offset);
        }
        gl.bindVertexArray(null);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
        // Because projection maps +Z (into screen) to NDC +Z, outward faces wind CW on screen
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CW);
        gl.clearColor(.035,.045,.09,1);
        return {gl,program,vao,buffer,canvas};
    }
    function render3(renderer, genome) {
        const {gl,program,vao,buffer,canvas}=renderer, size=canvas.width;
        gl.viewport(0,0,size,size); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        const cs=Math.cos(cam.yaw), sn=Math.sin(cam.yaw), cp=Math.cos(cam.pit), sp=Math.sin(cam.pit);
        const center=D/2-.5, near=.1, far=120;
        const vertices=[];
        const at=(x,y,z)=>{
            const dx=x-center-cam.x,dy=y-center-cam.y,dz=z-center-cam.z;
            const vx=dx*cs-dz*sn, vz=dx*sn+dz*cs;
            const vy=dy*cp+vz*sp, depth=-dy*sp+vz*cp;
            if(depth<=near) return null;
            const clipZ=((far+near)/(far-near))*depth+(2*far*near)/(near-far);
            return [vx*.9,vy*.9,clipZ,depth];
        };
        for(let z=0,i=0;z<D;z++) for(let y=0;y<D;y++) for(let x=0;x<D;x++,i++){
            const colorIndex=genome[i]; if(!colorIndex) continue;
            const rgb=PAL[colorIndex].map(c=>c/255);
            const neighbor=[genome[i+1]||0,genome[i-1]||0,genome[i+D]||0,genome[i-D]||0,genome[i+D*D]||0,genome[i-D*D]||0];
            for(let faceIndex=0;faceIndex<6;faceIndex++){
                const face=cubeFaces[faceIndex];
                const nx=x+face.n[0],ny=y+face.n[1],nz=z+face.n[2];
                if(nx>=0&&nx<D&&ny>=0&&ny<D&&nz>=0&&nz<D&&neighbor[faceIndex]) continue;
                const ao=0.88+0.12*((x+y+z+faceIndex)%3)/2;
                const points=face.v.map(v=>at(x+v[0],y+v[1],z+v[2]));
                if(points.some(p=>!p)) continue;
                for(const vi of faceIndices){
                    const p=points[vi]; vertices.push(p[0],p[1],p[2],p[3],...face.n,...rgb,ao);
                }
            }
        }
        gl.useProgram(program); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES,0,vertices.length/11);
    }
    function drawViews() {
        camDirty = false;
        const o = bestIdx * N;
        if (mode === 'text') {
            let h = '', cls = '', run = '';
            for (let i = 0; i < N; i++) {
                const g = cur[o + i], c = g === target[i] ? 'ok' : 'bad';
                if (c !== cls) {
                    if (run)
                        h += `<span class="${cls}">${run}</span>`;
                    cls = c;
                    run = '';
                }
                run += alpha[g];
            }
            h += `<span class="${cls}">${run}</span>`;
            if (h !== lastHtml) {
                $('bTxt').innerHTML = h;
                lastHtml = h;
            }
            return;
        }
        if (mode === '2d') {
            drawGrid(bctx, i => cur[o + i]);
            return;
        }
        const b = cur.subarray(o, o + N);
        render3(glRenderers.target, target);
        render3(glRenderers.best, b);
    }
    // ---------- GA state: flat typed arrays, double-buffered ----------
    let cur, nxt, fit = new Int32Array(POP), target, img;
    let gen = 0, bestIdx = 0, bestFit = 0, meanFit = 0, solved = false, running = true;
    let histBest = [], histMean = [];
    let seed = (Math.random() * 4294967296) >>> 0 || 1;
    const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    const rint = n => (rnd() * n) | 0;
    const randGene = () => (sparse && rnd() < .7) ? 0 : rint(K);
    function evaluate() {
        let best = -1, bi = 0, sum = 0;
        for (let p = 0, o = 0; p < POP; p++, o += N) {
            let f = 0;
            for (let i = 0; i < N; i++)
                if (cur[o + i] === target[i])
                    f++;
            fit[p] = f;
            sum += f;
            if (f > best) {
                best = f;
                bi = p;
            }
        }
        bestFit = best;
        bestIdx = bi;
        meanFit = sum / POP;
    }
    function tournament() { let w = rint(POP); for (let k = 1; k < TOURN; k++) {
        const c = rint(POP);
        if (fit[c] > fit[w])
            w = c;
    } return w; }
    function step() {
        const used = new Set();
        for (let e = 0; e < ELITE; e++) {
            let bi = -1;
            for (let p = 0; p < POP; p++)
                if (!used.has(p) && (bi < 0 || fit[p] > fit[bi]))
                    bi = p;
            used.add(bi);
            nxt.set(cur.subarray(bi * N, bi * N + N), e * N);
        }
        for (let c = ELITE; c < POP; c++) {
            const a = tournament() * N, b = tournament() * N, o = c * N;
            for (let i = 0; i < N; i++) {
                let g = rnd() < .5 ? cur[a + i] : cur[b + i];
                if (rnd() < MUT)
                    g = randGene();
                nxt[o + i] = g;
            }
        }
        const t = cur;
        cur = nxt;
        nxt = t;
        gen++;
        evaluate();
        histBest.push(bestFit);
        histMean.push(meanFit);
        if (bestFit === N) {
            solved = true;
            running = false;
            syncButton();
        }
    }
    // ---------- Setup (model / size change) ----------
    const $ = id => document.getElementById(id);
    let tctx = null, bctx = null;
    const cctx = $('chart').getContext('2d');
    function setCanvasMode(useWebGL) {
        for (const id of ['target','best']) {
            const oldCanvas=$(id), fresh=oldCanvas.cloneNode(false);
            fresh.width=oldCanvas.width; fresh.height=oldCanvas.height;
            oldCanvas.replaceWith(fresh);
            glRenderers[id]=null;
            if(useWebGL) glRenderers[id]=createGLRenderer(fresh);
            else if(id==='target') tctx=fresh.getContext('2d');
            else bctx=fresh.getContext('2d');
        }
        attachCanvasInteractions();
    }
    function setup() {
        const m = $('model').value, isText = m === 'text';
        mode = isText ? 'text' : m.startsWith('3d:') ? '3d' : '2d';
        $('textOpts').hidden = !isText;
        $('help3d').hidden = mode !== '3d';
        setCanvasMode(mode === '3d');
        $('size').disabled = isText;
        $('target').hidden = $('best').hidden = isText;
        $('tTxt').hidden = $('bTxt').hidden = !isText;
        sparse = mode === '3d';
        K = PAL.length;
        lastHtml = '';
        if (isText) {
            const lang = $('lang').value, phrase = TEXTS[lang][+$('phrase').value], chars = Array.from(phrase);
            alpha = makeAlphabet(lang);
            const idx = new Map(alpha.map((c, i) => [c, i]));
            N = chars.length;
            K = alpha.length;
            MUT = Math.min(.15, 1.5 / N);
            target = Uint16Array.from(chars, c => idx.get(c));
            cur = new Uint16Array(POP * N);
            nxt = new Uint16Array(POP * N);
            $('tTxt').textContent = phrase;
            $('tTxt').dir = $('bTxt').dir = lang === 'ar' ? 'rtl' : 'ltr';
        }
        else {
            W = +$('size').value;
            D = ({ 16: 8, 24: 12, 32: 16, 48: 20 })[W];
            N = sparse ? D * D * D : W * W;
            MUT = 1.5 / N;
            const px = sparse ? 440 : W;
            for (const id of ['target', 'best']) {
                const c = $(id);
                c.width = c.height = px;
                c.classList.toggle('smooth', sparse);
            }
            if (!sparse)
                img = bctx.createImageData(W, W);
            cur = new Uint8Array(POP * N);
            nxt = new Uint8Array(POP * N);
            if (sparse) {
                target = build3(m.slice(3));
                resetCam();
            }
            else {
                target = build(m);
                drawGrid(tctx, i => target[i]);
            }
        }
        init();
        fitText();
    }
    function init() {
        for (let i = 0; i < cur.length; i++)
            cur[i] = randGene();
        gen = 0;
        solved = false;
        running = true;
        histBest = [];
        histMean = [];
        evaluate();
        histBest.push(bestFit);
        histMean.push(meanFit);
        syncButton();
        render();
    }
    // ---------- Rendering ----------
    function drawGrid(ctx, get) {
        const d = img.data;
        for (let i = 0; i < N; i++) {
            const c = PAL[get(i)], j = i * 4;
            d[j] = c[0];
            d[j + 1] = c[1];
            d[j + 2] = c[2];
            d[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }
    const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    function drawChart() {
        const c = $('chart'), w = c.width, h = c.height, padL = 44, padB = 24, padT = 34, padR = 12;
        cctx.clearRect(0, 0, w, h);
        const mute = cssVar('--mute'), line = cssVar('--line'), acc = cssVar('--acc'), ok = cssVar('--ok'), ink = cssVar('--ink'), mean = '#ff8c32';
        cctx.font = '12px system-ui,sans-serif';
        const lo = Math.max(0, Math.floor(Math.min(...histMean.slice(0, 1), histMean[histMean.length - 1]) / 10) * 10 - 10), hi = N;
        const n = histBest.length, X = i => padL + (i / Math.max(1, n - 1)) * (w - padL - padR), Y = v => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);
        cctx.lineWidth = 1;
        cctx.strokeStyle = line;
        cctx.fillStyle = mute;
        for (let k = 0; k <= 4; k++) {
            const v = lo + (hi - lo) * k / 4, y = Y(v);
            cctx.beginPath();
            cctx.moveTo(padL, y);
            cctx.lineTo(w - padR, y);
            cctx.stroke();
            cctx.fillText(Math.round(v), 4, y + 4);
        }
        cctx.fillText('generation 0 → ' + gen, padL, h - 6);
        const stride = Math.max(1, Math.floor(n / (w - padL - padR)));
        const plot = (arr, col) => {
            cctx.strokeStyle = col;
            cctx.lineWidth = 2;
            cctx.beginPath();
            for (let i = 0; i < n; i += stride) {
                const x = X(i), y = Y(arr[i]);
                i ? cctx.lineTo(x, y) : cctx.moveTo(x, y);
            }
            cctx.lineTo(X(n - 1), Y(arr[n - 1]));
            cctx.stroke();
        };
        cctx.setLineDash([6, 4]);
        cctx.strokeStyle = ok;
        cctx.lineWidth = 1.5;
        cctx.beginPath();
        cctx.moveTo(padL, Y(N));
        cctx.lineTo(w - padR, Y(N));
        cctx.stroke();
        cctx.setLineDash([]);
        plot(histMean, mean);
        plot(histBest, acc);
        // legend
        const items = [[acc, 'Best fitness', 0], [mean, 'Mean fitness', 0], [ok, 'Perfect match (' + N + ')', 1]];
        let x = padL;
        cctx.fillStyle = ink;
        for (const [col, label, dash] of items) {
            cctx.strokeStyle = col;
            cctx.lineWidth = 2.5;
            cctx.setLineDash(dash ? [5, 3] : []);
            cctx.beginPath();
            cctx.moveTo(x, 14);
            cctx.lineTo(x + 22, 14);
            cctx.stroke();
            cctx.setLineDash([]);
            cctx.fillText(label, x + 28, 18);
            x += 28 + cctx.measureText(label).width + 22;
        }
    }
    function render() {
        drawViews();
        $('sGen').textContent = gen.toLocaleString();
        $('sBest').textContent = bestFit + ' / ' + N;
        $('sPct').textContent = (bestFit / N * 100).toFixed(1) + '%';
        $('sMean').textContent = meanFit.toFixed(1);
        $('matchCard').classList.toggle('done', solved);
        drawChart();
    }
    // ---------- Controls & loop ----------
    let last = performance.now(), acc = 0;
    const gpsOf = v => Math.round(Math.pow(10, v / 100 * 3));
    const syncSpeed = () => { $('gps').textContent = gpsOf(+$('speed').value) + ' gen/s'; };
    function syncButton() { const b = $('toggle'); b.textContent = solved ? 'Solved ✓' : running ? 'Stop' : 'Resume'; b.disabled = solved; }
    $('toggle').onclick = () => { if (solved)
        return; running = !running; last = performance.now(); syncButton(); };
    $('reset').onclick = () => { acc = 0; last = performance.now(); init(); };
    $('model').onchange = setup;
    $('lang').onchange = () => { fillPhrases(); setup(); };
    $('phrase').onchange = setup;
    $('size').onchange = setup;
    $('speed').oninput = syncSpeed;
    addEventListener('keydown', e => {
        if (mode !== '3d' || e.target.tagName === 'SELECT')
            return;
        const k = e.key.toLowerCase();
        if ('wasd '.includes(k) && k.length === 1 || k === 'shift') {
            keys.add(k);
            if (k !== 'shift')
                e.preventDefault();
        }
    });
    addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => keys.clear());
    function attachCanvasInteractions() {
        for (const id of ['target', 'best']) {
            const c = $(id);
            let drag = false;
            const look = e => {
                if (mode !== '3d' || !(drag || document.pointerLockElement)) return;
                cam.yaw += e.movementX * .006;
                cam.pit = Math.max(-1.5, Math.min(1.5, cam.pit + e.movementY * .006));
                camDirty = true;
            };
            c.addEventListener('pointerdown', e => { drag = true; c.setPointerCapture(e.pointerId); });
            c.addEventListener('pointerup', () => drag = false);
            c.addEventListener('pointercancel', () => drag = false);
            c.addEventListener('pointermove', look);
            c.addEventListener('dblclick', () => { try { if (mode === '3d') c.requestPointerLock(); } catch (_) { } });
            document.addEventListener('mousemove', e => { if (document.pointerLockElement === c) look(e); });
        }
    }
    function frame(now) {
        moveCam(now);
        if (!running && camDirty && mode === '3d')
            drawViews();
        if (running) {
            acc += (now - last) / 1000 * gpsOf(+$('speed').value);
            last = now;
            let steps = Math.min(Math.floor(acc), 100);
            acc -= Math.floor(acc);
            if (steps === 100)
                acc = 0;
            const t0 = performance.now();
            while (steps-- > 0 && running) {
                step();
                if (performance.now() - t0 > 12)
                    break;
            }
            render();
        }
        else
            last = now;
        requestAnimationFrame(frame);
    }
    fillPhrases();
    syncSpeed();
    setup();
    requestAnimationFrame(frame);
})();
