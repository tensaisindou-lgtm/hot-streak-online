const onlineSocket = io();
let onlineRoomCode = null;
let onlinePlayerId = null;
let onlineIsHost = false;
let onlineReady = false;
let onlineMode = false;
let onlineResolving = false;

function onlineSetStatus(text){ const e=document.getElementById('online-status'); if(e)e.textContent=text; }
function onlineName(){ return (document.getElementById('online-name')?.value||'プレイヤー').trim() || 'プレイヤー'; }
function onlineRenderRoom(room){
  onlineMode=true;
  onlineSetStatus(`接続中：${room.players.length}/${room.playerCount}人`);
  const info=document.getElementById('online-room-info'); if(info) info.innerHTML=`ルーム <span class="room-code">${room.code}</span>`;
  const list=document.getElementById('online-players'); if(list) list.innerHTML=room.players.map(p=>`<div>👤 ${p.name} ${p.ready?'✅ READY':''}${p.id===room.hostId?' 👑':''}</div>`).join('');
  const actions=document.getElementById('online-actions'); if(actions) actions.style.display='flex';
  const start=document.getElementById('online-start'); if(start) start.style.display=onlineIsHost?'inline-block':'none';
}
function onlineCreateRoom(){ onlineSocket.emit('room:create',{name:onlineName(),playerCount:Number(document.getElementById('online-player-count').value)}); }
function onlineJoinRoom(){ onlineSocket.emit('room:join',{name:onlineName(),code:document.getElementById('online-room-code').value}); }
function onlineToggleReady(){ onlineReady=!onlineReady; onlineSocket.emit('room:setReady',{code:onlineRoomCode,ready:onlineReady}); }
function onlineStartSetup(){ onlineSocket.emit('game:startSetup',{code:onlineRoomCode}); }

onlineSocket.on('connect',()=>onlineSetStatus('サーバー接続OK'));
onlineSocket.on('room:created',d=>{onlineRoomCode=d.code;onlinePlayerId=d.playerId;onlineIsHost=d.isHost;history.replaceState(null,'',`?room=${d.code}`);onlineSetStatus('ルーム作成済み');});
onlineSocket.on('room:joined',d=>{onlineRoomCode=d.code;onlinePlayerId=d.playerId;onlineIsHost=d.isHost;history.replaceState(null,'',`?room=${d.code}`);onlineSetStatus('ルーム参加済み');});
onlineSocket.on('room:update',onlineRenderRoom);
onlineSocket.on('room:error',m=>{onlineSetStatus('⚠️ '+m);alert(m);});
onlineSocket.on('deck:public',({cards})=>{ if(typeof publicDeck!=='undefined'){publicDeck=cards;updatePublicDeck();} });
onlineSocket.on('deck:hand',({cards})=>{
  if(typeof playerHands!=='undefined'){ playerHands=[cards]; setupPlayerIndex=0; updateDeckSetupUI(); const setup=document.getElementById('deck-setup'); if(setup)setup.classList.add('active'); }
  onlineSetStatus('🃏 秘密の3枚から1枚選ぶぽよ');
});
onlineSocket.on('deck:chosen',()=>{ const setup=document.getElementById('deck-setup'); if(setup)setup.classList.remove('active'); onlineSetStatus('選択完了。他プレイヤーの選択は非公開ぽよ'); });
onlineSocket.on('deck:choiceProgress',d=>onlineSetStatus(`🃏 デッキ構築：${d.chosen}/${d.total}人 選択済み`));
onlineSocket.on('game:started',d=>{ onlineSetStatus('🔥 レース開始！'); if(typeof raceDeck!=='undefined'){raceDeck=new Array(d.deckCount).fill(null);updateDeckCount();} if(typeof startRace==='function')startRace(); });
onlineSocket.on('game:card',async ({card,deckCount})=>{
  if(onlineResolving)return;
  onlineResolving=true; isResolvingCard=true;
  const b=document.querySelector('.draw-button');if(b)b.disabled=true;
  if(typeof updateDeckCount==='function'){raceDeck.length=deckCount;updateDeckCount();}
  if(typeof addCardHistory==='function')addCardHistory(card);
  if(typeof showCard==='function')showCard(card);
  try{ await sleep(850); await resolveCard(card); await sleep(150); }catch(e){console.error(e);showMessage('⚠️ 同期処理でエラーぽよ');}
  isResolvingCard=false; onlineResolving=false;
  if(b)b.disabled=false; if(typeof updateDeckCount==='function')updateDeckCount();
  if(onlinePlayerId) onlineSocket.emit('game:resolved',{code:onlineRoomCode});
});
onlineSocket.on('game:unlock',()=>{ onlineResolving=false; isResolvingCard=false; const b=document.querySelector('.draw-button');if(b)b.disabled=false; });

window.onlineMode = true;
window.drawCard = function(){
  if(!onlineRoomCode){ alert('まずオンラインのルームを作るか参加してねぽよ！'); return; }
  if(onlineResolving || typeof isResolvingCard!=='undefined' && isResolvingCard)return;
  onlineSocket.emit('game:draw',{code:onlineRoomCode});
};
window.choosePlayerCard = function(index){
  if(onlineRoomCode){ onlineSocket.emit('deck:choose',{code:onlineRoomCode,index}); return; }
};

// URL ?room=XXXX から参加コード欄へ反映
const roomFromUrl=new URLSearchParams(location.search).get('room');
if(roomFromUrl){ const e=document.getElementById('online-room-code'); if(e)e.value=roomFromUrl; }
