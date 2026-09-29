'use strict';

// One object holds everything that changes during a game.
const game = {
  deck: [],
  hands: [[], []],
  dealer: [],
  wins: [0, 0],
  chips: [500, 500],
  bets: [50, 50],
  profit: [0, 0],
  results: ['', ''],
  statuses: ['Waiting for the deal', 'Waiting for the deal'],
  turn: 0,
  round: 0,
  playing: false,
  over: false,
  message: 'Make yourselves comfortable.',
};

// Make 52 cards, then shuffle them using Fisher–Yates.
function createDeck() {
  const deck = [];
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  for (const suit of suits) {
    for (const rank of ranks) deck.push({ rank, suit });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Count aces as 11 first. Change them to 1 whenever the total is too high.
function handTotal(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 'A') {
      total += 11;
      aces++;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && handTotal(hand) === 21;
}

// The order matters: a busted player loses even if the dealer also busts.
function getResult(hand, dealer) {
  if (handTotal(hand) > 21) return 'Bust';
  if (isBlackjack(dealer)) return isBlackjack(hand) ? 'Push' : 'Lose';
  if (isBlackjack(hand)) return 'Blackjack';
  if (handTotal(dealer) > 21 || handTotal(hand) > handTotal(dealer)) return 'Win';
  if (handTotal(hand) === handTotal(dealer)) return 'Push';
  return 'Lose';
}

function dealRound(bets = [50, 50], deck = createDeck()) {
  if (game.playing || game.over) return;
  // Check both bets before dealing, so an invalid bet changes nothing.
  for (let i = 0; i < 2; i++) {
    if (!Number.isSafeInteger(bets[i]) || bets[i] < 1) {
      throw new Error(`Player ${i + 1}: enter a whole-number bet of at least 1 chip.`);
    }
    if (bets[i] > game.chips[i]) throw new Error(`Player ${i + 1}: you only have ${game.chips[i]} chips.`);
  }
  game.bets = [...bets];
  game.chips[0] -= bets[0];
  game.chips[1] -= bets[1];
  game.profit = [0, 0];
  game.deck = deck;
  game.hands = [[], []];
  game.dealer = [];
  game.results = ['', ''];
  game.statuses = ['Waiting', 'Waiting'];
  game.turn = 0;
  game.round++;
  game.playing = true;

  // Deal one card to each seat, twice. pop() takes the deck's top card.
  for (let pass = 0; pass < 2; pass++) {
    game.hands[0].push(game.deck.pop());
    game.hands[1].push(game.deck.pop());
    game.dealer.push(game.deck.pop());
  }
  if (isBlackjack(game.dealer)) finishRound();
  else chooseTurn();
}

// Skip players who already have blackjack. Everyone else gets a turn.
function chooseTurn() {
  while (game.turn < 2 && isBlackjack(game.hands[game.turn])) {
    game.statuses[game.turn] = 'Blackjack';
    game.turn++;
  }
  if (game.turn === 2) {
    finishRound();
  } else {
    game.statuses[game.turn] = 'Your turn';
    game.message = `Player ${game.turn + 1}, your move.`;
  }
}

function hit() {
  if (!game.playing) return;
  game.hands[game.turn].push(game.deck.pop());
  const total = handTotal(game.hands[game.turn]);
  if (total >= 21) {
    game.statuses[game.turn] = total > 21 ? 'Bust' : '21 — standing';
    game.turn++;
    chooseTurn();
  }
}

function stand() {
  if (!game.playing) return;
  game.statuses[game.turn] = 'Standing';
  game.turn++;
  chooseTurn();
}

// Whole chips keep betting simple. Round a blackjack's 3:2 profit down.
function getProfit(result, bet) {
  if (result === 'Blackjack') return Math.floor(bet * 1.5);
  if (result === 'Win') return bet;
  if (result === 'Push') return 0;
  return -bet;
}

function finishRound() {
  if (!game.playing) return; // Prevent counting the same result twice.
  // Draw only when it can affect a player's result. Soft 17 also stands.
  const needsDealer = game.hands.some(hand => handTotal(hand) <= 21 && !isBlackjack(hand));
  while (needsDealer && handTotal(game.dealer) < 17) {
    game.dealer.push(game.deck.pop());
  }
  game.playing = false;
  game.hands.forEach((hand, index) => {
    const result = getResult(hand, game.dealer);
    game.results[index] = result;
    game.statuses[index] = 'Round complete';
    if (result === 'Win' || result === 'Blackjack') game.wins[index]++;
    game.profit[index] = getProfit(result, game.bets[index]);
    // The bet was already deducted: return it plus the net result.
    game.chips[index] += game.bets[index] + game.profit[index];
  });
  const descriptions = { Win: 'wins', Blackjack: 'wins with blackjack', Lose: 'loses', Bust: 'busts', Push: 'pushes' };
  game.message = `Player 1 ${descriptions[game.results[0]]}. Player 2 ${descriptions[game.results[1]]}.`;
  game.over = game.chips.some(chips => chips === 0);
  if (game.over) {
    const loser = game.chips[0] === 0 ? 0 : 1;
    game.message = game.chips.every(chips => chips === 0)
      ? 'Both players are out of chips. Game over.'
      : `Player ${loser + 1} is out of chips. Player ${2 - loser} wins the table!`;
  }
}

function resetGame() {
  game.wins = [0, 0];
  game.chips = [500, 500];
  game.bets = [50, 50];
  game.profit = [0, 0];
  game.round = 0;
  game.playing = false;
  game.over = false;
  game.turn = 0;
  game.hands = [[], []];
  game.dealer = [];
  game.deck = [];
  game.results = ['', ''];
  game.statuses = ['Waiting for the deal', 'Waiting for the deal'];
  game.message = 'Make yourselves comfortable.';
}

// Everything below this line updates the page. The rules above need no HTML.
function showCards(id, hand, hideSecond = false) {
  const container = document.getElementById(id);
  container.replaceChildren();
  const suitNames = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
  if (hand.length === 0) {
    const placeholder = document.createElement('span');
    placeholder.className = 'card-placeholder';
    placeholder.textContent = '♠';
    placeholder.setAttribute('aria-hidden', 'true');
    container.append(placeholder);
    return;
  }
  hand.forEach((card, index) => {
    const element = document.createElement('div');
    element.className = 'card';
    element.setAttribute('role', 'img');
    if (hideSecond && index === 1) {
      element.classList.add('card-back');
      element.setAttribute('aria-label', 'Face-down card');
      element.textContent = '♠';
    } else {
      if (card.suit === '♥' || card.suit === '♦') element.classList.add('red');
      element.setAttribute('aria-label', `${card.rank} of ${suitNames[card.suit]}`);
      const corner = document.createElement('span');
      corner.className = 'card-corner';
      corner.textContent = card.rank + card.suit;
      const suit = document.createElement('span');
      suit.className = 'card-suit';
      suit.textContent = card.suit;
      element.append(corner, suit);
    }
    container.append(element);
  });
}

function render() {
  const text = (id, value) => { document.getElementById(id).textContent = value; };
  text('round', game.round ? `ROUND ${String(game.round).padStart(2, '0')}` : 'READY WHEN YOU ARE');
  text('message', game.message);
  text('hint', game.playing ? 'Hit for another card. Stand to keep your hand.' : game.round ? 'Ready for another? Deal a fresh hand.' : 'Press Deal to start your first round.');
  if (game.over) text('hint', 'Start a new table to give both players 500 chips again.');
  showCards('dealer-cards', game.dealer, game.playing);
  text('dealer-total', game.playing ? '?' : game.dealer.length ? handTotal(game.dealer) : '—');
  for (let i = 0; i < 2; i++) {
    showCards(`cards-${i}`, game.hands[i]);
    text(`total-${i}`, game.hands[i].length ? handTotal(game.hands[i]) : '—');
    text(`wins-${i}`, game.wins[i]);
    text(`chips-${i}`, game.chips[i].toLocaleString());
    text(`wager-${i}`, `BET ${game.bets[i]}`);
    text(`state-${i}`, game.statuses[i]);
    const change = game.profit[i] > 0 ? `+${game.profit[i]}` : String(game.profit[i]);
    text(`result-${i}`, game.results[i] ? `${game.results[i]} · ${change}` : game.playing ? 'Aim for 21.' : 'Choose your opening bet.');
    document.getElementById(`bet-controls-${i}`).hidden = game.playing || game.over;
    const input = document.getElementById(`bet-${i}`);
    input.max = game.chips[i];
    if (!game.playing && !game.over && Number(input.value) > game.chips[i]) input.value = game.chips[i];
    document.getElementById(`player-${i}`).classList.toggle('active', game.playing && game.turn === i);
    document.getElementById(`player-${i}`).classList.toggle('winner', ['Win', 'Blackjack'].includes(game.results[i]));
  }
  document.getElementById('deal').hidden = game.playing;
  text('deal', game.over ? 'New table ↗' : game.round ? 'Next hand ↗' : 'Deal the cards ↗');
  document.getElementById('hit').hidden = !game.playing;
  document.getElementById('stand').hidden = !game.playing;
}

function resetTable() {
  resetGame();
  document.getElementById('bet-0').value = 50;
  document.getElementById('bet-1').value = 50;
  document.getElementById('error').hidden = true;
}

// Button clicks call a game function, then redraw the table.
if (typeof document !== 'undefined') {
  const dealFromInputs = () => {
    if (game.over) resetTable();
    else dealRound([Number(document.getElementById('bet-0').value), Number(document.getElementById('bet-1').value)]);
  };
  for (const [id, action] of [['deal', dealFromInputs], ['hit', hit], ['stand', stand]]) {
    document.getElementById(id).addEventListener('click', () => {
      const error = document.getElementById('error');
      error.hidden = true;
      try {
        action();
        render();
        const focus = game.playing ? 'hit' : 'deal';
        document.getElementById(focus).focus({ preventScroll: true });
      } catch (problem) {
        error.textContent = problem.message;
        error.hidden = false;
      }
    });
  }
  document.getElementById('reset').addEventListener('click', () => {
    if (window.confirm('Start over with 500 chips each and clear the win counts?')) {
      resetTable();
      render();
      document.getElementById('deal').focus({ preventScroll: true });
    }
  });
  render();
}

// This small export lets the optional Node tests check the same game code.
if (typeof module !== 'undefined') {
  module.exports = { game, createDeck, handTotal, isBlackjack, getResult, getProfit, dealRound, hit, stand, finishRound, resetGame };
}
