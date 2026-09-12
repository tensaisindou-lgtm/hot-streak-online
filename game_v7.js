// ========================================
// 🔥 HOT STREAK 自作版
// ========================================


// ========================================
// 🎮 ゲーム設定
// ========================================

const MIN_POSITION = 1;
const MAX_POSITION = 14;

const START_POSITION = 3;
const GOAL_POSITION = 14;

const STAR_POSITIONS = [
    1,
    8,
    13,
    14
];


// ========================================
// 🛣️ レーン
// ========================================

const LANE_ORDER = [
    "gobura",
    "mum",
    "harley",
    "dunkle"
];


// ========================================
// 🏃 キャラクター
// ========================================

const runners = {

    gobura: {
        name: "ゴブラー",
        position: START_POSITION,
        lane: 0,
        fallen: false,
        direction: 1,
        finished: false,
        rank: null
    },

    mum: {
        name: "マム",
        position: START_POSITION,
        lane: 1,
        fallen: false,
        direction: 1,
        finished: false,
        rank: null
    },

    harley: {
        name: "ハーレー",
        position: START_POSITION,
        lane: 2,
        fallen: false,
        direction: 1,
        finished: false,
        rank: null
    },

    dunkle: {
        name: "ダンクル",
        position: START_POSITION,
        lane: 3,
        fallen: false,
        direction: 1,
        finished: false,
        rank: null
    }

};


// ========================================
// 🏆 順位
// ========================================

const finishOrder = [];


// ========================================
// 🎴 デッキ
// ========================================

// 元の全カード（現在は55枚）
let sourceDeck = [];

// 今回のレースで使う公開14枚
let publicDeck = [];

// プレイヤーの秘密手札（各3枚）
let playerHands = [];

// 各プレイヤーがデッキへ追加した1枚
let playerAddedCards = [];

// 実際にめくる山札
let raceDeck = [];

// 各周回で一時除外する3枚
let temporarilyExcludedCards = [];

// 使い終わったカード。デッキ切れ時に一時除外カードと一緒に再山札化する
let discardDeck = [];

const PUBLIC_DECK_SIZE = 14;
const HAND_SIZE = 3;
const PLAYER_MIN = 2;
const PLAYER_MAX = 4;

let playerCount = 2;
let setupPlayerIndex = 0;
let deckConstructionFinished = false;


// ========================================
// 📜 履歴
// ========================================

const cardHistory = [];

const MAX_HISTORY = 8;


// ========================================
// 🔒 カード処理中
// ========================================

let isResolvingCard = false;


// ========================================
// ⏱️ 演出速度
// ========================================

const MOVE_TIME = 180;
const STUMBLE_TIME = 650;
const GOAL_TIME = 900;


// ========================================
// 🎴 デッキ生成
// ========================================

function createRaceDeck() {

    const deck = [];

    const characterIds =
        Object.keys(runners);


    characterIds.forEach(id => {

        // 通常移動

        deck.push({
            type: "move",
            target: id,
            amount: 1
        });


        deck.push({
            type: "move",
            target: id,
            amount: 2
        });


        deck.push({
            type: "move",
            target: id,
            amount: 3
        });


        // ⭐ 星

        deck.push({
            type: "star",
            target: id
        });


        // 🤕 転倒

        deck.push({
            type: "fall",
            target: id
        });


        // ↩️ 2マス戻る

        deck.push({
            type: "move",
            target: id,
            amount: -2
        });


        // 🤸 よろけ①：1マス進む＋コース内側へ1マス（2枚）
        for (let i = 0; i < 2; i++) {
            deck.push({
                type: "stumble",
                target: id,
                amount: 1,
                stumbleDirection: "inner"
            });
        }

        // 🤸 よろけ②：2マス進む＋右へ1マス
        deck.push({
            type: "stumble",
            target: id,
            amount: 2,
            stumbleDirection: "right"
        });


        // 🤸 よろけ②：2マス進む＋左へ1マス
        deck.push({
            type: "stumble",
            target: id,
            amount: 2,
            stumbleDirection: "left"
        });

        // 🤸 よろけ③：3マス進む＋コース外側へ1マス
        deck.push({
            type: "stumble",
            target: id,
            amount: 3,
            stumbleDirection: "outer"
        });


        // 🔄 方向転換

        deck.push({
            type: "turn",
            target: id
        });


        // 💚 回復

        deck.push({
            type: "heal",
            target: id
        });

    });


    // ====================================
    // 👥 全員移動
    // ====================================

    deck.push({
        type: "allMove",
        amount: 1
    });


    deck.push({
        type: "allMove",
        amount: 2
    });


    deck.push({
        type: "allMove",
        amount: 3
    });


    return deck;

}


// ========================================
// 📝 カード名
// ========================================

function getCardText(card) {

    let text = "";


    if (card.type === "move") {

        const runner =
            runners[card.target];


        if (card.amount > 0) {

            text =
                runner.name +
                " " +
                card.amount +
                "マス進む";

        }

        else {

            text =
                runner.name +
                " " +
                Math.abs(card.amount) +
                "マス戻る";

        }

    }


    else if (card.type === "allMove") {

        text =
            "全員 " +
            card.amount +
            "マス進む";

    }


    else if (card.type === "star") {

        text =
            runners[card.target].name +
            " ⭐ 星まで進む";

    }


    else if (card.type === "fall") {

        text =
            runners[card.target].name +
            " 🤕 転倒";

    }


    else if (card.type === "stumble") {

        text =
            runners[card.target].name +
            " " +
            card.amount +
            "マス進み" +
            (
                card.stumbleDirection === "inner"
                    ? "コース内側に1マス"
                    : card.stumbleDirection === "outer"
                        ? "コース外側に1マス"
                        : card.stumbleDirection === "left"
                            ? "左に1マス"
                            : "右に1マス"
            ) +
            "よろける";

    }


    else if (card.type === "turn") {

        text =
            runners[card.target].name +
            " 🔄 方向転換";

    }


    else if (card.type === "heal") {

        text =
            runners[card.target].name +
            " 💚 回復 → 2マス進む";

    }


    return text;

}


// ========================================
// 🎨 カードタイプ
// ========================================

function getCardTypeName(card) {

    if (card.type === "star") {
        return "STAR";
    }

    if (card.type === "fall") {
        return "FALL";
    }

    if (card.type === "heal") {
        return "HEAL";
    }

    if (card.type === "turn") {
        return "TURN";
    }

    if (card.type === "stumble") {
        return "STUMBLE";
    }

    if (card.type === "allMove") {
        return "ALL MOVE";
    }

    return "MOVE";

}




// ========================================
// 🔀 シャッフル
// ========================================

function shuffleArray(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );


        [
            array[i],
            array[j]
        ] = [
            array[j],
            array[i]
        ];

    }

    return array;

}


function shuffleDeck() {

    shuffleArray(raceDeck);

}


// ========================================
// 🎴 デッキ準備
// ========================================

function setupDeck() {

    sourceDeck = createRaceDeck();
    shuffleArray(sourceDeck);

    // まず14枚を公開デッキとして確定
    publicDeck = sourceDeck.slice(0, PUBLIC_DECK_SIZE);

    // 残りのカードから各プレイヤーへ3枚ずつ秘密配布
    const remainingDeck = sourceDeck.slice(PUBLIC_DECK_SIZE);
    playerHands = [];
    playerAddedCards = [];

    for (let i = 0; i < playerCount; i++) {

        const hand = [];

        for (let j = 0; j < HAND_SIZE; j++) {
            hand.push(remainingDeck.pop());
        }

        playerHands.push(hand);
    }

    setupPlayerIndex = 0;
    deckConstructionFinished = false;
    raceDeck = [];
    temporarilyExcludedCards = [];
    discardDeck = [];

    updateDeckCount();
    updatePublicDeck();
    updateDeckSetupUI();
}


// ========================================
// 🃏 デッキ構築フェーズ
// ========================================

function beginDeckSetup() {

    const countInput = document.getElementById("player-count");

    if (countInput) {
        playerCount = Math.max(
            PLAYER_MIN,
            Math.min(PLAYER_MAX, Number(countInput.value) || 2)
        );
    }

    const setup = document.getElementById("deck-setup");
    if (setup) setup.classList.add("active");

    setupDeck();

    showMessage("🃏 公開14枚を確認して、プレイヤーごとに1枚追加するぽよ！");
}


function choosePlayerCard(cardIndex) {

    if (deckConstructionFinished) return;

    const hand = playerHands[setupPlayerIndex];
    if (!hand || !hand[cardIndex]) return;

    const selected = hand[cardIndex];
    playerAddedCards.push(selected);

    // 残り2枚はゲームから完全除外
    playerHands[setupPlayerIndex] = [];

    setupPlayerIndex++;

    if (setupPlayerIndex >= playerCount) {
        finishDeckConstruction();
        return;
    }

    updateDeckSetupUI();
    showMessage(`🃏 プレイヤー${setupPlayerIndex + 1} の番ぽよ！`);
}


function finishDeckConstruction() {

    deckConstructionFinished = true;

    // 公開14枚 + 各プレイヤーが選んだ1枚だけを最終デッキへ
    raceDeck = [
        ...publicDeck,
        ...playerAddedCards
    ];

    shuffleDeck();

    // ここで公開終了。以降は誰が何を追加したか表示しない
    const setup = document.getElementById("deck-setup");
    if (setup) setup.classList.remove("active");

    const publicElement = document.getElementById("public-deck");
    if (publicElement) {
        publicElement.innerHTML =
            '<div class="public-deck-closed">🔒 公開終了 — デッキの中身は非公開です</div>';
    }

    // ゲーム開始前にランダム3枚を一時除外
    excludeThreeCards();

    showMessage(
        `🔥 ${raceDeck.length}枚のデッキ完成！ 3枚を一時除外してレーススタート！`
    );

    updateDeckCount();

    // 実際のレース開始処理
    startRace();
}


function excludeThreeCards() {

    temporarilyExcludedCards = [];

    for (let i = 0; i < 3 && raceDeck.length > 0; i++) {
        const index = Math.floor(Math.random() * raceDeck.length);
        temporarilyExcludedCards.push(raceDeck.splice(index, 1)[0]);
    }
}


function recycleExcludedCards() {

    // デッキ切れ時は、今回使い切ったカード＋一時除外カードを
    // もう一度山札に戻して再構築する。
    const rebuildCards = [
        ...discardDeck,
        ...temporarilyExcludedCards
    ];

    if (rebuildCards.length === 0) {
        return;
    }

    raceDeck = rebuildCards;
    discardDeck = [];
    temporarilyExcludedCards = [];

    shuffleDeck();

    // 再び3枚を一時除外して、残りからゲームを再開
    excludeThreeCards();
}


function updateDeckSetupUI() {

    const title = document.getElementById("deck-setup-title");
    const handArea = document.getElementById("player-hand");

    if (!title || !handArea) return;

    title.textContent =
        `プレイヤー${setupPlayerIndex + 1}：3枚から1枚選んでデッキに追加`;

    const hand = playerHands[setupPlayerIndex] || [];

    handArea.innerHTML = hand.map((card, index) => `
        <button class="private-card" onclick="choosePlayerCard(${index})">
            <span class="private-card-type">${getCardTypeName(card)}</span>
            <span class="private-card-text">${getCardText(card)}</span>
        </button>
    `).join("");
}


// ========================================
// 👀 公開デッキ表示
// ========================================

function updatePublicDeck() {

    const element = document.getElementById("public-deck");
    if (!element) return;

    if (publicDeck.length === 0) {
        element.innerHTML =
            '<div class="public-deck-empty">公開デッキを準備中……</div>';
        return;
    }

    element.innerHTML = publicDeck.map((card, index) => `
        <div class="public-card-row">
            <span class="public-card-number">${index + 1}</span>
            <span class="public-card-type">${getCardTypeName(card)}</span>
            <span class="public-card-text">${getCardText(card)}</span>
        </div>
    `).join("");
}


// ========================================
// 📜 履歴追加
// ========================================

function addCardHistory(card) {

    cardHistory.unshift({
        text: getCardText(card),
        type: getCardTypeName(card)
    });

    if (cardHistory.length > MAX_HISTORY) {
        cardHistory.pop();
    }

    updateCardHistory();
}


// ========================================
// 📜 履歴表示
// ========================================

function updateCardHistory() {

    const element = document.getElementById("card-history");

    if (!element) {
        return;
    }

    if (cardHistory.length === 0) {

        element.innerHTML = `
            <div class="history-empty">
                まだカードを引いていません
            </div>
        `;

        return;
    }

    element.innerHTML = cardHistory.map(item => {

        return `
            <div class="history-item ${item.type.toLowerCase().replace(" ", "-")}">
                <span class="history-type">${item.type}</span>
                <span class="history-text">${item.text}</span>
            </div>
        `;

    }).join("");
}


// ========================================
// 🎴 カードを引く
// ========================================

async function drawCard() {

    if (isResolvingCard) return;

    if (raceDeck.length === 0) {
        recycleExcludedCards();
        updateDeckCount();
        showMessage("🔄 デッキ切れ！使ったカードと一時除外の3枚を戻してシャッフル、また3枚を除外したぽよ！");
        if (raceDeck.length === 0) return;
    }

    const button = document.querySelector(".draw-button");
    isResolvingCard = true;
    if (button) button.disabled = true;

    try {
        const card = raceDeck.pop();
        if (!card) throw new Error("カードを取得できませんでした");

        // 引いたカードは捨て札へ。デッキ切れ時に再山札化する。
        discardDeck.push(card);

        updateDeckCount();
        addCardHistory(card);
        showCard(card);

        await sleep(850);
        await resolveCard(card);
        await sleep(150);

    } catch (error) {
        console.error("HOT STREAK: カード処理中にエラー", error);
        showMessage("⚠️ カード処理でエラーが起きたぽよ。もう一度引いてみて！");
    } finally {
        isResolvingCard = false;
        if (button) button.disabled = false;
        updateDeckCount();
    }

}


// ========================================
// 🎴 カード表示
// ========================================

function showCard(card) {

    const element =
        document.getElementById(
            "card"
        );


    if (!element) {
        return;
    }


    const text =
        getCardText(card);

    const subText =
        getCardTypeName(card);


    element.classList.remove(
        "card-flip",
        "card-star",
        "card-fall",
        "card-heal",
        "card-turn",
        "card-stumble",
        "card-allmove",
        "card-move"
    );


    void element.offsetWidth;


    const typeClass =
        "card-" +
        (
            card.type === "allMove"
                ? "allmove"
                : card.type
        );


    element.classList.add(
        typeClass
    );


    element.innerHTML =
        `
        <div class="card-shine"></div>

        <div class="card-content">

            <div class="card-type">
                ${subText}
            </div>

            <div class="card-main">
                ${text}
            </div>

        </div>
        `;


    element.classList.add(
        "card-flip"
    );

}


// ========================================
// ⚙️ カード処理
// ========================================

async function resolveCard(card) {

    // ====================================
    // 👥 全員移動
    // ====================================

    if (
        card.type === "allMove"
    ) {

        await resolveAllMove(card);

        return;

    }


    const runner =
        runners[card.target];


    if (!runner) {
        return;
    }


    // ====================================
    // 🛑 ゴール済みは完全停止
    // ====================================

    if (
        runner.finished
    ) {

        showMessage(
            "🏁 " +
            runner.name +
            " はもうゴール済み！動かない！"
        );

        return;

    }


    // ====================================
    // 🔢 通常移動
    // ====================================

    if (
        card.type === "move"
    ) {

        await moveRunnerStepByStep(
            card.target,
            card.amount
        );

    }


    // ====================================
    // ⭐ 星
    // ====================================

    else if (
        card.type === "star"
    ) {

        await resolveStar(
            card.target
        );

    }


    // ====================================
    // 🔄 方向転換
    // ====================================

    else if (
        card.type === "turn"
    ) {

        runner.direction *= -1;


        updateRunner(
            card.target
        );


        showMessage(
            "🔄 " +
            runner.name +
            " が方向転換！"
        );

    }


    // ====================================
    // 🤸 よろけ
    // ====================================

    else if (
        card.type === "stumble"
    ) {

        await resolveStumble(card);

    }


    // ====================================
    // 🤕 転倒
    // ====================================

    else if (
        card.type === "fall"
    ) {

        resolveFall(
            card.target
        );

    }


    // ====================================
    // 💚 回復
    // ====================================

    else if (
        card.type === "heal"
    ) {

        await resolveHeal(
            card.target
        );

    }

}


// ========================================
// 👥 全員移動
// ========================================

async function resolveAllMove(card) {

    const ids =
        Object.keys(runners);


    showMessage(
        "🔥 全員 " +
        card.amount +
        "マス進む！"
    );


    /*
       全員移動は方向転換の影響を受けない。

       必ずゴール方向へ進む。

       さらに全員同時開始にするため
       Promise.all を使用。
    */

    await Promise.all(

        ids.map(id => {

            const runner =
                runners[id];


            if (
                !runner ||
                runner.finished
            ) {

                return Promise.resolve();

            }


            return moveRunnerStepByStep(
                id,
                card.amount,
                {
                    ignoreCollision: true,
                    forceGoalDirection: true
                }
            );

        })

    );


    checkRaceComplete();

}


// ========================================
// 🚶 1マスずつ移動
// ========================================

async function moveRunnerStepByStep(
    id,
    amount,
    options = {}
) {

    const runner =
        runners[id];


    if (
        !runner ||
        runner.finished
    ) {

        return;

    }


    const ignoreCollision =
        options.ignoreCollision === true;


    const forceGoalDirection =
        options.forceGoalDirection === true;


    // ====================================
    // 🤕 転倒中は必ず1マス
    // ====================================

    let actualAmount;


    if (
        runner.fallen
    ) {

        actualAmount = 1;

    }

    else {

        actualAmount = amount;

    }


    // ====================================
    // ➡️ 移動方向
    // ====================================

    let direction;


    if (
        forceGoalDirection
    ) {

        // 全員移動・回復などは
        // 必ずゴール方向

        direction = 1;

    }

    else {

        direction =
            runner.direction;

    }


    const stepDirection =
        actualAmount >= 0
            ? direction
            : -direction;


    const steps =
        Math.abs(actualAmount);


    for (
        let i = 0;
        i < steps;
        i++
    ) {

        // =================================
        // 🛑 ゴール・脱落済みは即停止
        // =================================

        if (
            runner.finished
        ) {

            break;

        }


        // =================================
        // 1マス移動
        // =================================

        runner.position +=
            stepDirection;


        // =================================
        // 💀 コースアウト
        // =================================

        if (
            runner.position <
            MIN_POSITION
        ) {

            setRankByElimination(id);

            break;

        }


        // =================================
        // 🏃 位置更新
        // =================================

        updateRunner(id);

        updatePositionText(id);


        // =================================
        // 🏃 移動モーション
        // =================================

        playMoveAnimation(id);


        await sleep(
            MOVE_TIME
        );


        // =================================
        // 🏁 ゴール
        // =================================

        if (
            runner.position >=
            GOAL_POSITION
        ) {

            runner.position =
                GOAL_POSITION;


            await reachGoal(id);

            break;

        }


        // =================================
        // 💥 衝突
        // =================================

        if (
            !ignoreCollision
        ) {

            checkCollision(id);


            if (
                runner.finished
            ) {

                break;

            }

        }

    }


    if (
        !runner.finished
    ) {

        if (
            runner.fallen
        ) {

            showMessage(
                "🤕 " +
                runner.name +
                " は転倒中！1マス進んだ！"
            );

        }

        else if (
            steps > 0
        ) {

            showMessage(
                "🎴 " +
                runner.name +
                " が " +
                Math.abs(actualAmount) +
                "マス移動！"
            );

        }

    }

}


// ========================================
// ⭐ 星カード
// ========================================

async function resolveStar(id) {

    const runner =
        runners[id];


    if (
        !runner ||
        runner.finished
    ) {

        return;

    }


    if (
        runner.fallen
    ) {

        await moveRunnerStepByStep(
            id,
            1
        );

        return;

    }


    const nextStar =
        getNextStar(
            runner.position,
            runner.direction
        );


    if (
        nextStar === null
    ) {

        showMessage(
            "⭐ " +
            runner.name +
            " の先に星がない！"
        );

        return;

    }


    const distance =
        Math.abs(
            nextStar -
            runner.position
        );


    await moveRunnerStepByStep(
        id,
        distance
    );


    if (
        !runner.finished
    ) {

        showMessage(
            "⭐ " +
            runner.name +
            " が★まで " +
            distance +
            "マス進んだ！"
        );

    }

}


// ========================================
// 🤸 よろけ
// ========================================

async function resolveStumble(card) {

    const runner =
        runners[card.target];

    if (
        !runner ||
        runner.finished
    ) {
        return;
    }

    // ====================================
    // 🏃 まず指定マス数だけ進む
    // ====================================

    await moveRunnerStepByStep(
        card.target,
        card.amount
    );

    if (
        runner.finished
    ) {
        return;
    }

    // ====================================
    // 🤸 よろけ演出
    // ====================================

    playStumbleAnimation(
        card.target
    );

    showMessage(
        "🤸 " +
        runner.name +
        " がよろけた！"
    );

    await sleep(
        STUMBLE_TIME
    );

    if (
        runner.finished
    ) {
        return;
    }

    // ====================================
    // ↔️ よろけ方向を決定
    // ====================================

    let laneChange = 0;

    if (
        card.stumbleDirection === "inner"
    ) {

        // コース内側へ1レーン。
        // 0→1、1→2、2→1、3→2
        if (runner.lane === 0) {
            laneChange = 1;
        } else if (runner.lane === LANE_ORDER.length - 1) {
            laneChange = -1;
        } else if (runner.lane === 1) {
            laneChange = 1;
        } else {
            laneChange = -1;
        }

    } else if (
        card.stumbleDirection === "outer"
    ) {

        // コース外側へ1レーン。
        // 0→コースアウト、1→0、2→3、3→コースアウト
        if (runner.lane === 0) {
            laneChange = -1;
        } else if (runner.lane === 1) {
            laneChange = -1;
        } else if (runner.lane === 2) {
            laneChange = 1;
        } else {
            laneChange = 1;
        }

    } else {

        // 右/左は、従来どおり進行方向に対する左右
        laneChange =
            getLaneChangeFromDirection(
                runner,
                card.stumbleDirection
            );
    }

    const newLane =
        runner.lane +
        laneChange;

    // ====================================
    // 💀 コース外
    // ====================================

    if (
        newLane < 0 ||
        newLane >= LANE_ORDER.length
    ) {

        setRankByElimination(
            card.target
        );

        await playFallAnimation(
            card.target
        );

        return;
    }

    moveRunnerToLane(
        card.target,
        newLane
    );

    updateRunner(
        card.target
    );

    updatePositionText(
        card.target
    );

    // ====================================
    // 💥 レーン変更後の衝突
    // ====================================

    checkCollision(
        card.target
    );
}

// ========================================
// 💚 回復
// ========================================

async function resolveHeal(id) {

    const runner =
        runners[id];


    if (
        !runner ||
        runner.finished
    ) {

        return;

    }


    // ====================================
    // 💚 転倒解除
    // ====================================

    runner.fallen =
        false;


    // ====================================
    // 🔄 方向転換も回復
    // ====================================

    runner.direction =
        1;


    updateRunner(id);
    updatePositionText(id);


    showMessage(
        "💚 " +
        runner.name +
        " が回復！" +
        "ゴール方向へ戻った！"
    );


    await sleep(
        350
    );


    // ====================================
    // ➡️ ゴール方向へ2マス
    // ====================================

    showMessage(
        "💚 " +
        runner.name +
        " が回復して2マス進む！"
    );


    await moveRunnerStepByStep(
        id,
        2,
        {
            forceGoalDirection: true
        }
    );

}


// ========================================
// 🤕 転倒
// ========================================

function resolveFall(id) {

    const runner =
        runners[id];


    if (
        !runner ||
        runner.finished
    ) {

        return;

    }


    if (
        runner.fallen
    ) {

        setRankByElimination(
            id
        );

        return;

    }


    runner.fallen =
        true;


    updateRunner(id);
    updatePositionText(id);


    playFallAnimation(id);


    showMessage(
        "🤕 " +
        runner.name +
        " が転んだ！"
    );

}


// ========================================
// ↔️ 左右判定
// ========================================

function getLaneChangeFromDirection(
    runner,
    side
) {

    if (
        runner.direction === 1
    ) {

        if (
            side === "left"
        ) {

            return -1;

        }

        if (
            side === "right"
        ) {

            return 1;

        }

    }


    if (
        runner.direction === -1
    ) {

        if (
            side === "left"
        ) {

            return 1;

        }

        if (
            side === "right"
        ) {

            return -1;

        }

    }


    return 0;

}


// ========================================
// 💥 コースアウト
// ========================================

function checkCourseOut(id) {

    const runner =
        runners[id];


    if (!runner) {
        return false;
    }


    if (
        runner.position <
        MIN_POSITION
    ) {

        setRankByElimination(
            id
        );

        return true;

    }


    return false;

}


// ========================================
// 🏆 脱落順位
// ========================================

function setRankByElimination(id) {

    const runner =
        runners[id];


    if (
        !runner ||
        runner.finished
    ) {

        return;

    }


    // ====================================
    // 💀 コースアウト順位
    // ====================================
    //
    // コースアウトは後ろから順位を付ける。
    //
    // 1人目 → 4位
    // 2人目 → 3位
    // 3人目 → 2位
    //
    // すでにゴールした人数は関係ない。
    //

    const totalRunners =
        Object.keys(runners).length;


    const eliminatedCount =
        Object.values(runners)
            .filter(
                r =>
                    r.rank !== null &&
                    r.position < GOAL_POSITION
            )
            .length;


    runner.finished =
        true;


    runner.rank =
        totalRunners -
        eliminatedCount;


    // 順位が重複しない安全策

    while (
        Object.values(runners)
            .some(
                r =>
                    r !== runner &&
                    r.rank === runner.rank
            )
    ) {

        runner.rank--;

    }


    finishOrder.push(id);


    const element =
        document.getElementById(id);


    if (element) {

        element.classList.remove(
            "moving",
            "stumbling",
            "fallen",
            "goal"
        );


        element.classList.add(
            "eliminated"
        );

    }


    updatePositionText(id);


    showMessage(
        "💥 " +
        runner.name +
        " がコースアウト！" +
        runner.rank +
        "位！💀"
    );


    checkRaceComplete();

}


// ========================================
// ⭐ 次の星
// ========================================

function getNextStar(
    currentPosition,
    direction
) {

    if (
        direction === 1
    ) {

        for (
            const star of STAR_POSITIONS
        ) {

            if (
                star >
                currentPosition
            ) {

                return star;

            }

        }

    }


    if (
        direction === -1
    ) {

        for (
            let i =
                STAR_POSITIONS.length - 1;

            i >= 0;

            i--
        ) {

            const star =
                STAR_POSITIONS[i];


            if (
                star <
                currentPosition
            ) {

                return star;

            }

        }

    }


    return null;

}


// ========================================
// 💥 衝突
// ========================================

function checkCollision(
    enteringId
) {

    const enteringRunner =
        runners[enteringId];


    if (
        !enteringRunner ||
        enteringRunner.finished
    ) {

        return;

    }


    Object.keys(runners).forEach(
        otherId => {

            if (
                otherId === enteringId
            ) {

                return;

            }


            const otherRunner =
                runners[otherId];


            if (
                !otherRunner ||
                otherRunner.finished
            ) {

                return;

            }


            if (

                enteringRunner.lane ===
                otherRunner.lane &&

                enteringRunner.position ===
                otherRunner.position

            ) {

                if (
                    otherRunner.fallen
                ) {

                    setRankByElimination(
                        otherId
                    );


                    showMessage(
                        "💥 " +
                        enteringRunner.name +
                        " が " +
                        otherRunner.name +
                        " に衝突！" +
                        otherRunner.name +
                        " は転倒中のため脱落！"
                    );

                }

                else {

                    otherRunner.fallen =
                        true;


                    updateRunner(
                        otherId
                    );


                    updatePositionText(
                        otherId
                    );


                    playFallAnimation(
                        otherId
                    );


                    showMessage(
                        "💥 " +
                        enteringRunner.name +
                        " と " +
                        otherRunner.name +
                        " が衝突！" +
                        otherRunner.name +
                        " が転倒！🤕"
                    );

                }

            }

        }
    );

}


// ========================================
// 🚶 レーン移動
// ========================================

function moveRunnerToLane(
    id,
    newLane
) {

    const runner =
        runners[id];


    if (
        !runner ||
        runner.finished
    ) {

        return false;

    }


    if (
        newLane < 0 ||
        newLane >= LANE_ORDER.length
    ) {

        return false;

    }


    const newLaneId =
        LANE_ORDER[newLane];


    const newTrack =
        document.getElementById(
            "track-" + newLaneId
        );


    const element =
        document.getElementById(id);


    if (
        !newTrack ||
        !element
    ) {

        return false;

    }


    runner.lane =
        newLane;


    newTrack.appendChild(
        element
    );


    return true;

}


// ========================================
// 🏃 キャラクター位置更新
// ========================================

function updateRunner(id) {

    const runner =
        runners[id];


    const element =
        document.getElementById(id);


    if (
        !runner ||
        !element
    ) {

        return;

    }


    const laneId =
        LANE_ORDER[runner.lane];


    const track =
        document.getElementById(
            "track-" + laneId
        );


    if (!track) {
        return;
    }


    const cell =
        track.querySelector(
            `[data-position="${runner.position}"]`
        );


    if (!cell) {
        return;
    }


    const cellCenter =
        cell.offsetLeft +
        cell.offsetWidth / 2;


    const runnerCenter =
        element.offsetWidth / 2;


    element.style.left =
        (
            cellCenter -
            runnerCenter
        ) +
        "px";


    // ====================================
    // 向き
    // ====================================

    if (
        runner.fallen
    ) {

        element.style.transform =
            "rotate(90deg)";

    }

    else if (
        runner.direction === -1
    ) {

        element.style.transform =
            "scaleX(-1)";

    }

    else {

        element.style.transform =
            "scaleX(1)";

    }

}


// ========================================
// 📊 位置表示
// ========================================

function updatePositionText(id) {

    const runner =
        runners[id];


    if (!runner) {
        return;
    }


    let displayText;


    if (
        runner.rank !== null
    ) {

        if (
            runner.rank === 1
        ) {

            displayText =
                "🏆 1位";

        }

        else {

            displayText =
                runner.rank +
                "位";

        }

    }

    else if (
        runner.position >=
        GOAL_POSITION
    ) {

        displayText =
            "🏁 GOAL";

    }

    else if (
        runner.position ===
        START_POSITION
    ) {

        displayText =
            "START";

    }

    else {

        displayText =
            (
                runner.position -
                START_POSITION
            ) +
            "マス";

    }


    if (
        runner.rank === null &&
        runner.fallen
    ) {

        displayText +=
            " 🤕";

    }


    const element =
        document.getElementById(
            "pos-" + id
        );


    if (element) {

        element.textContent =
            displayText;

    }

}


// ========================================
// 🏁 ゴール
// ========================================

async function reachGoal(id) {

    const runner =
        runners[id];


    if (
        !runner ||
        runner.finished
    ) {

        return;

    }


    // ====================================
    // 🛑 ゴール地点に完全固定
    // ====================================

    runner.position =
        GOAL_POSITION;


    // ====================================
    // 🏆 ゴール順位
    // ====================================
    //
    // ゴール済み人数だけを数える。
    // コースアウト順位は一切影響しない。
    //

    const goalCount =
        Object.values(runners)
            .filter(
                r =>
                    r !== runner &&
                    r.rank !== null &&
                    r.position >= GOAL_POSITION
            )
            .length;


    runner.finished =
        true;


    runner.rank =
        goalCount + 1;


    // ====================================
    // 順位重複防止
    // ====================================

    while (
        Object.values(runners)
            .some(
                r =>
                    r !== runner &&
                    r.rank === runner.rank &&
                    r.position >= GOAL_POSITION
            )
    ) {

        runner.rank++;

    }


    finishOrder.push(id);


    updateRunner(id);
    updatePositionText(id);


    // ====================================
    // 🏁 ゴール演出
    // ====================================

    const element =
        document.getElementById(id);


    if (element) {

        element.classList.remove(
            "moving",
            "stumbling",
            "fallen",
            "eliminated"
        );


        element.classList.add(
            "goal"
        );

    }


    showMessage(
        "🏁 " +
        runner.name +
        " がゴール！！ " +
        getRankEmoji(runner.rank) +
        runner.rank +
        "位！！🎉"
    );


    await sleep(
        GOAL_TIME
    );


    // ゴール後は絶対に位置変更しない

    runner.position =
        GOAL_POSITION;


    updateRunner(id);
    updatePositionText(id);


    checkRaceComplete();

}


// ========================================
// 🏁 ゴール判定
// ========================================

function checkGoal(id) {

    const runner =
        runners[id];


    if (
        !runner ||
        runner.finished
    ) {

        return false;

    }


    if (
        runner.position >=
        GOAL_POSITION
    ) {

        reachGoal(id);

        return true;

    }


    return false;

}


// ========================================
// 🏆 レース終了
// ========================================

function checkRaceComplete() {

    const activeRunners =
        Object.entries(runners)
            .filter(
                ([id, runner]) =>
                    !runner.finished
            );


    // ====================================
    // まだ2人以上残っている
    // ====================================

    if (
        activeRunners.length > 1
    ) {

        return false;

    }


    // ====================================
    // 最後の1人
    // ====================================

    if (
        activeRunners.length === 1
    ) {

        const [
            lastId,
            lastRunner
        ] =
            activeRunners[0];


        // ====================================
        // 🏁 最後の1人はゴール扱い
        // ====================================

        lastRunner.position =
            GOAL_POSITION;


        // ====================================
        // 🏆 すでにゴールした人数
        // ====================================

        const goalCount =
            Object.values(runners)
                .filter(
                    runner =>
                        runner !== lastRunner &&
                        runner.finished &&
                        runner.rank !== null &&
                        runner.position >= GOAL_POSITION
                )
                .length;


        lastRunner.finished =
            true;


        lastRunner.rank =
            goalCount + 1;


        // ====================================
        // 順位重複防止
        // ====================================

        while (
            Object.values(runners)
                .some(
                    runner =>
                        runner !== lastRunner &&
                        runner.rank === lastRunner.rank &&
                        runner.position >= GOAL_POSITION
                )
        ) {

            lastRunner.rank++;

        }


        finishOrder.push(
            lastId
        );


        updateRunner(
            lastId
        );


        updatePositionText(
            lastId
        );


        const element =
            document.getElementById(
                lastId
            );


        if (element) {

            element.classList.remove(
                "moving",
                "stumbling",
                "fallen",
                "eliminated"
            );


            element.classList.add(
                "goal"
            );

        }


        showMessage(
            "🏁 " +
            lastRunner.name +
            " がゴール！" +
            " " +
            getRankEmoji(lastRunner.rank) +
            lastRunner.rank +
            "位！"
        );

    }


    // ====================================
    // 🏆 最終順位
    // ====================================

    showFinalRanking();


    return true;

}


// ========================================
// 🏆 最終順位
// ========================================

function showFinalRanking() {

    const ranking =
        Object.entries(runners)
            .filter(
                ([id, runner]) =>
                    runner.rank !== null
            )
            .sort(
                (a, b) =>
                    a[1].rank -
                    b[1].rank
            );


    if (
        ranking.length === 0
    ) {

        return;

    }


    console.log(
        "===== 最終順位 ====="
    );


    ranking.forEach(
        ([id, runner]) => {

            console.log(
                runner.rank +
                "位:",
                runner.name
            );

        }
    );


    const rankingText =
        ranking
            .map(
                ([id, runner]) =>
                    getRankEmoji(runner.rank) +
                    runner.rank +
                    "位 " +
                    runner.name
            )
            .join(
                "　"
            );


    showMessage(
        "🏆 レース終了！ " +
        rankingText
    );

}


// ========================================
// 🏆 順位絵文字
// ========================================

function getRankEmoji(rank) {

    if (rank === 1) {
        return "🥇";
    }

    if (rank === 2) {
        return "🥈";
    }

    if (rank === 3) {
        return "🥉";
    }

    return "🏅";

}


// ========================================
// 🏃 移動演出
// ========================================

function playMoveAnimation(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.classList.remove(
        "moving"
    );


    void element.offsetWidth;


    element.classList.add(
        "moving"
    );


    setTimeout(() => {

        element.classList.remove(
            "moving"
        );

    }, MOVE_TIME + 30);

}


// ========================================
// 🤸 よろけ演出
// ========================================

function playStumbleAnimation(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.classList.remove(
        "stumbling"
    );


    void element.offsetWidth;


    element.classList.add(
        "stumbling"
    );


    setTimeout(() => {

        element.classList.remove(
            "stumbling"
        );

    }, STUMBLE_TIME + 30);

}


// ========================================
// 🤕 転倒演出
// ========================================

function playFallAnimation(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;

    }


    element.classList.remove(
        "fallen"
    );


    void element.offsetWidth;


    element.classList.add(
        "fallen"
    );

}


// ========================================
// 💬 メッセージ
// ========================================

function showMessage(text) {

    const element =
        document.getElementById(
            "message"
        );


    if (element) {

        element.textContent =
            text;

    }

}


// ========================================
// 📦 デッキ枚数
// ========================================

function updateDeckCount() {

    const element =
        document.getElementById(
            "deck-count"
        );


    if (element) {

        element.textContent =
            "レースデッキ残り：" +
            raceDeck.length +
            "枚 / 一時除外：" +
            temporarilyExcludedCards.length +
            "枚";

    }

}


// ========================================
// 💤 待機
// ========================================

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


// ========================================
// 🛣️ コース作成
// ========================================

function createTrack() {

    LANE_ORDER.forEach(id => {

        const track =
            document.getElementById(
                "track-" + id
            );


        const runner =
            document.getElementById(id);


        if (!track) {
            return;
        }


        track
            .querySelectorAll(".cell")
            .forEach(
                cell => {
                    cell.remove();
                }
            );


        for (
            let position = MIN_POSITION;
            position <= MAX_POSITION;
            position++
        ) {

            const cell =
                document.createElement(
                    "div"
                );


            cell.classList.add(
                "cell"
            );


            cell.dataset.position =
                position;


            // ⭐ 星

            if (
                STAR_POSITIONS.includes(
                    position
                )
            ) {

                cell.classList.add(
                    "star"
                );

                cell.textContent =
                    "★";

            }


            // START

            if (
                position ===
                START_POSITION
            ) {

                cell.classList.add(
                    "start"
                );

                cell.textContent =
                    "START";

            }


            // GOAL

            if (
                position ===
                GOAL_POSITION
            ) {

                cell.classList.add(
                    "goal"
                );

                cell.textContent =
                    "GOAL";

            }


            // 通常マス

            if (
                !STAR_POSITIONS.includes(
                    position
                ) &&

                position !==
                START_POSITION &&

                position !==
                GOAL_POSITION
            ) {

                if (
                    position <
                    START_POSITION
                ) {

                    cell.textContent =
                        "-" +
                        (
                            START_POSITION -
                            position
                        );

                }

                else {

                    cell.textContent =
                        position -
                        START_POSITION;

                }

            }


            track.appendChild(
                cell
            );

        }


        if (runner) {

            track.appendChild(
                runner
            );

        }

    });

}


// ========================================
// 🔥 ゲーム開始
// ========================================

function startGame() {

    // 新しいゲームではまずデッキ構築フェーズへ
    beginDeckSetup();

}


function startRace() {

    const drawButton = document.querySelector(".draw-button");
    if (drawButton) drawButton.disabled = false;

    // ====================================
    // キャラクター初期化
    // ====================================
    Object.keys(runners).forEach(id => {
        const runner = runners[id];
        runner.position = START_POSITION;
        runner.fallen = false;
        runner.direction = 1;
        runner.finished = false;
        runner.rank = null;
        runner.lane = LANE_ORDER.indexOf(id);

        const element = document.getElementById(id);
        if (element) {
            element.classList.remove("eliminated", "moving", "stumbling", "fallen", "goal");
            element.style.left = "";
            element.style.transform = "scaleX(1)";
        }
    });

    // ====================================
    // 盤面を作成してSTART(3)へ配置
    // ====================================
    createTrack();

    Object.keys(runners).forEach(id => {
        moveRunnerToLane(id, runners[id].lane);
        updateRunner(id);
        updatePositionText(id);
    });

    // ====================================
    // 順位
    // ====================================
    finishOrder.length = 0;

    // ====================================
    // 履歴
    // ====================================
    cardHistory.length = 0;
    updateCardHistory();

    // ====================================
    // カード初期化
    // ====================================
    const card = document.getElementById("card");
    if (card) {
        card.className = "";
        card.id = "card";
        card.innerHTML = `
            <div class="card-back">
                🎴
            </div>
        `;
    }

    // ====================================
    // スタート
    // ====================================
    showMessage("🔥 レーススタート！");
    updateDeckCount();
    isResolvingCard = false;

}


// ========================================
// 🚀 起動
// ========================================

if (!window.HOT_STREAK_ONLINE) {
    startGame();
}
