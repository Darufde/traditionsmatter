/* Traditions Matter — culture, the council and your influence.
   You do not command the people. You hold Respect, and spend it to speak
   in the council and to shift the people's leanings over time. The council
   members each have their own convictions and vote as they see fit.
   The game favors the old ways: tradition brings lasting strength, while the
   newcomers' goods bring quick comfort at a slow, real cost. */
(function () {
  'use strict';
  const TM = window.TM;
  const { U, RNG } = TM;

  const ARCH = (TM.ARCHETYPES = {
    keeper: { label: 'Keeper of the old ways', t: { trad: 0.95, open: 0.12, war: 0.38, caution: 0.65 } },
    peacemaker: { label: 'Peacemaker', t: { trad: 0.65, open: 0.5, war: 0.05, caution: 0.75 } },
    warrior: { label: 'War leader', t: { trad: 0.75, open: 0.1, war: 0.95, caution: 0.2 } },
    trader: { label: 'Trader', t: { trad: 0.3, open: 0.9, war: 0.2, caution: 0.35 } },
    pragmatist: { label: 'Pragmatist', t: { trad: 0.5, open: 0.5, war: 0.4, caution: 0.6 } },
    young: { label: 'Voice of the young', t: { trad: 0.45, open: 0.65, war: 0.7, caution: 0.25 } },
  });

  TM.LEANINGS = [
    { key: 'ways', name: 'Our ways', opts: [
      [-1, 'Hold to the old ways', 'More evenings of stories, more time for crafts and gatherings. New goods are taken up slowly.'],
      [0, 'Take what is useful', 'Keep the old ways, but use new things where they help.'],
      [1, 'Take up new tools', 'Iron, cloth and guns spread quickly and work goes faster, but the old crafts and words fade.']] },
    { key: 'newcomers', name: 'Toward the newcomers', needs: 'rumors', opts: [
      [-1, 'Keep our distance', 'Few visits and little trade. Less sickness, cooler relations.'],
      [0, 'Be cautious', 'Trade when it suits us and watch them closely.'],
      [1, 'Welcome them', 'Frequent trade and visits. Warmer relations, more of their ways, more sickness.']] },
    { key: 'hunt', name: 'The hunt', opts: [
      [0, 'Hunt for our needs', 'Take only what the people need. The animals stay plentiful.'],
      [1, 'Hunt furs for trade', 'Trap beaver and fox and take extra deer for hides to trade. Goods flow in, but the animals grow scarce.']] },
    { key: 'defense', name: 'Our defense', opts: [
      [-1, 'Seek peace', 'Avoid provocation. Relations warm, but we are less ready if trouble comes.'],
      [0, 'Stay watchful', 'Keep the young men ready without alarming anyone.'],
      [1, 'Prepare for war', 'Young men train with weapons and keep watch. The newcomers notice.']] },
  ];
  const LEAN_COST = 6;
  const SPEAK_COST = 3;
  TM.LEAN_COST = LEAN_COST;
  TM.SPEAK_COST = SPEAK_COST;
  TM.ENDING_YEAR = 13; // the story closes when the thirteenth year begins

  TM.GATHERINGS = [
    { id: 'renewal', name: 'Spring Renewal Gathering', season: 0, moon: 2, dom: 2, kind: 'dance', g: 0.08, food: 0.5,
      text: 'The fields are planted. The people gather to feast, give thanks and dance around the central fire.' },
    { id: 'ballgame', name: 'The great ball game', season: 1, moon: 1, dom: 2, kind: 'ball', g: 0.07, food: 0.5,
      text: 'Village and camp meet on the plaza for the great ball game, with feasting afterwards.' },
    { id: 'harvest', name: 'Harvest Gathering', season: 2, moon: 1, dom: 3, kind: 'dance', g: 0.14, food: 1.5,
      text: 'The harvest is in. Families feast together, give gifts and dance late into the night.' },
    { id: 'midwinter', name: 'Midwinter Stories', season: 3, moon: 1, dom: 2, kind: 'stories', g: 0.09, food: 0.3, language: 0.04,
      text: 'Through the long night the elders tell the old stories to the whole village, as they have since the beginning.' },
  ];

  // ================================================================== debates
  // profile axes: trad (keeps the old ways), open (toward the newcomers),
  // war (willing to fight), caution (safe and careful)
  const ISSUES = [];
  const issue = (o) => ISSUES.push(o);
  const foodDays = (x) => x.sim.foodTotal() / Math.max(1, x.sim.needPerDay());

  issue({
    id: 'share_stores', title: 'Hungry days', cooldown: 24, priority: 3,
    when: (x) => foodDays(x) < 9 && x.sim.c.season !== 2,
    text: (x) => `Stores are down to about ${Math.floor(foodDays(x))} days of food. The hunting camp asks the village to share its maize, and the hunters want to go out on a long hunt.`,
    options: [
      { label: 'Share what we have equally', desc: 'Everyone eats less, but no family goes hungry while another eats well.', profile: { trad: 0.7, open: 0, war: 0, caution: -0.1 }, hints: ['+ Unity'], apply: (x) => { x.cul.unity += 0.05; x.cul.respect += 1; } },
      { label: 'Send the hunters on a long hunt', desc: 'More hunters for the next six days. A hard, risky trek.', profile: { trad: 0.3, open: 0, war: 0.4, caution: -0.5 }, hints: ['+ Meat for six days', '− Risk of injury'], apply: (x) => { x.cul.flags.huntPush = x.sim.day + 6; } },
      { label: 'Ration strictly', desc: 'Smaller meals for eight days. People will weaken a little.', profile: { trad: 0, open: 0, war: -0.1, caution: 0.9 }, hints: ['− Food eaten', '− Health'], apply: (x) => { x.cul.flags.ration = x.sim.day + 8; } },
    ],
  });
  issue({
    id: 'teach_young', title: 'The winter teaching', cooldown: 40, priority: 2,
    when: (x) => x.sim.c.season === 3,
    text: () => 'The elders ask that the children spend the long winter evenings by the fire, learning the old stories, the names of every plant and animal, and the words of our own language.',
    options: [
      { label: 'Every evening, all winter', desc: 'The elders will teach the children each night.', profile: { trad: 1, open: -0.2, war: 0, caution: 0.2 }, hints: ['+ Language', '+ Knowledge'], apply: (x) => { x.cul.trad.language += 0.05; x.cul.flags.teach = x.sim.day + 12; } },
      { label: 'When the work allows', desc: 'Some evenings, when the day’s work is done.', profile: { trad: 0.4, open: 0, war: 0, caution: 0.5 }, hints: ['+ Language'], apply: (x) => { x.cul.trad.language += 0.02; } },
      { label: 'The young must learn to work', desc: 'Firewood and hides come first this winter.', profile: { trad: -0.6, open: 0.3, war: 0, caution: 0.3 }, hints: ['− Language', '+ Firewood'], apply: (x) => { x.cul.trad.language -= 0.02; x.sim.stores.wood += 60; } },
    ],
  });
  issue({
    id: 'neighbors', title: 'Strangers at the hunting grounds', once: true, priority: 2,
    when: (x) => x.sim.c.year === 1 && x.sim.day > 6,
    text: () => 'Hunters of a neighboring nation have been seen following the bison herd across our western hunting grounds.',
    options: [
      { label: 'Share the grounds and exchange gifts', desc: 'Send hides and a message of friendship.', profile: { trad: 0.5, open: 0.6, war: -0.7, caution: 0.1 }, hints: ['− Hides', '+ Friendship with neighbors'], apply: (x) => { x.sim.stores.hides = Math.max(0, x.sim.stores.hides - 8); x.cul.flags.neighbors = 1; x.cul.respect += 2; } },
      { label: 'Warn them off', desc: 'Our warriors will make it clear whose grounds these are.', profile: { trad: 0.3, open: -0.6, war: 0.8, caution: -0.3 }, hints: ['+ Bison for us', '− Neighbors'], apply: (x) => { x.cul.flags.neighbors = -1; x.nat.pop.bison = Math.min(1.1, x.nat.pop.bison + 0.05); } },
    ],
  });
  issue({
    id: 'family_dispute', title: 'A quarrel between families', cooldown: 28, priority: 1,
    when: (x) => x.sim.day > 8 && x.cul.rng.chance(0.5),
    text: (x) => `Two families of the ${x.cul.rng.pick(TM.CLANS).name} Clan quarrel over the boundary between their fields.`,
    options: [
      { label: 'Let the clan elders settle it', desc: 'The old way: the clan decides among its own.', profile: { trad: 0.9, open: 0, war: 0, caution: 0.3 }, hints: ['+ Unity', '+ Tradition'], apply: (x) => { x.cul.unity += 0.03; x.cul.trad.gatherings += 0.01; } },
      { label: 'The council will divide the field', desc: 'A quick decision from the council.', profile: { trad: -0.1, open: 0.2, war: 0, caution: 0.6 }, hints: ['+ Unity'], apply: (x) => { x.cul.unity += 0.015; } },
    ],
  });
  issue({
    id: 'feast_low_food', title: 'A gathering in lean times', cooldown: 10, priority: 4,
    when: (x) => { const g = x.cul.nextGathering(4); return g && g.food >= 1 && foodDays(x) < 14 && !x.cul.flags.cancel[g.id + x.sim.c.year]; },
    text: (x) => `The ${x.cul.nextGathering(4).name} is close, but stores are thin. A great feast would eat into what is left.`,
    options: [
      { label: 'Hold the gathering as always', desc: 'Our gatherings hold us together. We will find the food.', profile: { trad: 1, open: 0, war: 0, caution: -0.4 }, hints: ['+ Tradition', '+ Unity', '− Food'], apply: () => {} },
      { label: 'A small gathering', desc: 'Dance and stories, but a simple meal.', profile: { trad: 0.4, open: 0, war: 0, caution: 0.5 }, hints: ['Half the effect, half the food'], apply: (x) => { x.cul.flags.small[x.cul.nextGathering(4).id + x.sim.c.year] = 1; } },
      { label: 'Not this year', desc: 'Save the food. People will be disappointed.', profile: { trad: -0.9, open: 0, war: 0, caution: 0.9 }, hints: ['− Tradition', '− Unity'], apply: (x) => { x.cul.flags.cancel[x.cul.nextGathering(4).id + x.sim.c.year] = 1; x.cul.unity -= 0.04; } },
    ],
  });
  // ---- first word of the newcomers
  issue({
    id: 'strange_goods', title: 'Strange goods from the east', once: true, priority: 9,
    when: (x) => x.col.stage === 'rumors',
    text: () => 'Traders from the nations to the east bring strange things passed from hand to hand: a knife of grey metal that never dulls, beads like blue ice, a scrap of soft woven cloth. They speak of pale strangers who came across the great water in houses that float.',
    options: [
      { label: 'Seek out these goods', desc: 'Send hides east to trade for more.', profile: { trad: -0.5, open: 0.9, war: 0, caution: -0.4 }, hints: ['+ Goods', '− Hides'], apply: (x) => { x.cul.integ.goods += 0.04; x.sim.stores.hides = Math.max(0, x.sim.stores.hides - 10); x.col.contact += 0.3; } },
      { label: 'Let each family decide', desc: 'The council will not forbid it or encourage it.', profile: { trad: 0, open: 0.3, war: 0, caution: 0.3 }, hints: ['+ Goods (a little)'], apply: (x) => { x.cul.integ.goods += 0.015; } },
      { label: 'We need nothing from them', desc: 'Our own tools have always served us.', profile: { trad: 0.9, open: -0.7, war: 0, caution: 0.4 }, hints: ['+ Crafts', '+ Respect'], apply: (x) => { x.cul.trad.crafts += 0.02; x.cul.respect += 2; } },
    ],
  });
  issue({
    id: 'first_traders', title: 'Traders on the river', once: true, priority: 10,
    when: (x) => x.col.stage === 'traders' && x.col.firstVisitDone,
    text: () => 'Strangers have come down the river by canoe: men with hair on their faces, carrying iron kettles, knives, hatchets, wool blankets and glass beads. They want beaver pelts and deer hides, and they will come back.',
    options: [
      { label: 'Trade with them freely', desc: 'Families may trade whenever the traders come.', profile: { trad: -0.6, open: 1, war: -0.3, caution: -0.5 }, hints: ['+ Goods', '+ Relations', '− Tradition over time'], apply: (x) => { x.col.tradeLevel = 2; x.cul.integ.goods += 0.06; x.col.relations += 15; } },
      { label: 'Trade carefully', desc: 'A little at a time, through the council.', profile: { trad: 0.3, open: 0.4, war: -0.1, caution: 0.6 }, hints: ['+ Goods (a little)', '+ Relations'], apply: (x) => { x.col.tradeLevel = 1; x.cul.integ.goods += 0.02; x.col.relations += 5; } },
      { label: 'Send them away', desc: 'Tell them not to come back.', profile: { trad: 0.9, open: -0.9, war: 0.2, caution: 0.3 }, hints: ['+ Respect', '− Relations'], apply: (x) => { x.col.tradeLevel = 0; x.col.relations -= 12; x.cul.respect += 2; } },
    ],
  });
  issue({
    id: 'furs_demand', title: 'The traders want beaver', cooldown: 70, priority: 6,
    when: (x) => x.col.tradeLevel > 0 && x.col.visits >= 2 && x.cul.lean.hunt.t === 0,
    text: () => 'The traders want far more beaver pelts than we have ever taken. For a season of trapping they promise guns, kettles and cloth.',
    options: [
      { label: 'Trap beaver for trade', desc: 'Our hunters turn to furs.', profile: { trad: -0.6, open: 0.8, war: 0, caution: -0.4 }, hints: ['+ Goods', '− Beaver and deer'], apply: (x) => { x.cul.lean.hunt.t = 1; x.col.relations += 6; } },
      { label: 'Take only what we need', desc: 'The animals are not ours to empty from the land.', profile: { trad: 0.9, open: -0.3, war: 0, caution: 0.4 }, hints: ['+ Animals stay plentiful', '− Relations'], apply: (x) => { x.cul.lean.hunt.t = 0; x.col.relations -= 4; x.cul.respect += 1; } },
    ],
  });
  issue({
    id: 'spirits', title: 'The traders’ drink', once: true, priority: 6,
    when: (x) => x.col.visits >= 3 && x.col.tradeLevel > 0,
    text: () => 'The traders offer a strong drink they call brandy. Some of the young men have already tasted it, and there was fighting afterwards.',
    options: [
      { label: 'Forbid it in our village', desc: 'The traders will be told to keep it away.', profile: { trad: 0.8, open: -0.3, war: 0, caution: 0.8 }, hints: ['+ Unity', '− Relations (a little)'], apply: (x) => { x.cul.flags.spirits = false; x.col.relations -= 4; x.cul.unity += 0.03; } },
      { label: 'Allow it', desc: 'Each person can decide for themselves.', profile: { trad: -0.7, open: 0.7, war: 0.1, caution: -0.7 }, hints: ['+ Relations', '− Health and unity over time'], apply: (x) => { x.cul.flags.spirits = true; x.col.relations += 6; } },
    ],
  });
  issue({
    id: 'muskets', title: 'Guns from the traders', once: true, priority: 5,
    when: (x) => x.col.visits >= 2 && x.col.relations > -10 && x.col.tradeLevel > 0,
    text: () => 'The traders offer muskets: loud weapons that kill at a distance. But they need powder and shot that only the newcomers can supply.',
    options: [
      { label: 'Trade for many guns', desc: 'Every hunter who wants one.', profile: { trad: -0.5, open: 0.6, war: 0.6, caution: -0.5 }, hints: ['+ Hunting and defense while trade lasts', '− Bow skills'], apply: (x) => { x.cul.flags.guns = Math.min(1, x.cul.flags.guns + 0.55); x.cul.integ.goods += 0.04; } },
      { label: 'A few, for defense', desc: 'Kept by the war leader.', profile: { trad: 0, open: 0.3, war: 0.4, caution: 0.4 }, hints: ['+ Defense'], apply: (x) => { x.cul.flags.guns = Math.min(1, x.cul.flags.guns + 0.2); } },
      { label: 'Keep to our bows', desc: 'A bow can be made by anyone, anywhere.', profile: { trad: 1, open: -0.4, war: -0.1, caution: 0.4 }, hints: ['+ Crafts', '+ Respect'], apply: (x) => { x.cul.trad.crafts += 0.02; x.cul.respect += 2; } },
    ],
  });
  // ---- the colony
  issue({
    id: 'colony_founded', title: 'The newcomers build', once: true, priority: 10,
    when: (x) => x.col.founded,
    text: (x) => `The newcomers are cutting the eastern woods. They have raised a log fort and houses at the head of the creek and call the place ${x.col.name}. More of them are coming.`,
    options: [
      { label: 'Welcome them as neighbors', desc: 'Send a delegation with gifts.', profile: { trad: -0.3, open: 1, war: -0.8, caution: -0.2 }, hints: ['+ Relations', '+ Trade'], apply: (x) => { x.col.relations += 20; x.cul.lean.newcomers.t = 1; } },
      { label: 'Tell them how far they may go', desc: 'Mark a boundary they must not cross.', profile: { trad: 0.85, open: 0.2, war: 0.1, caution: 0.7 }, hints: ['Sets a boundary', '+ Land'], apply: (x) => { x.col.setBoundary(140); x.col.relations += 3; } },
      { label: 'Drive them out before they grow', desc: 'Warriors will burn the fort and the houses.', profile: { trad: 0.7, open: -1, war: 1, caution: -0.8 }, hints: ['War party', '− Relations'], apply: (x) => { x.col.relations -= 40; x.col.warParty('Driving out the newcomers'); } },
    ],
  });
  issue({
    id: 'land_request', title: 'They want the eastern forest', cooldown: 60, priority: 7,
    when: (x) => x.col.founded && x.col.pop > 70 && !x.col.war && x.col.blockedDays > 4,
    text: (x) => `The leader of ${x.col.name} offers kettles, cloth, blankets and guns for the forest east of the creek, where our hunters take deer.`,
    options: [
      { label: 'Sell the land', desc: 'Goods now. The forest will be cleared for farms.', profile: { trad: -0.9, open: 0.9, war: -0.5, caution: -0.2 }, hints: ['+ Goods', '− Land', '− Deer'], apply: (x) => { x.col.sellLand(260); x.cul.integ.goods += 0.1; x.col.relations += 15; } },
      { label: 'Refuse', desc: 'The land is not ours to sell. It belongs to those not yet born.', profile: { trad: 0.9, open: -0.4, war: 0.2, caution: 0.1 }, hints: ['+ Respect', '− Relations'], apply: (x) => { x.col.relations -= 10; x.cul.respect += 2; } },
      { label: 'Agree on a firm boundary', desc: 'They may keep what they have, and no more.', profile: { trad: 0.4, open: 0.4, war: -0.3, caution: 0.8 }, hints: ['Boundary at their current edge'], apply: (x) => { x.col.setBoundary(x.col.claimed + 25); x.col.relations += 4; } },
    ],
  });
  issue({
    id: 'missionary', title: 'A teacher from the colony', once: true, priority: 6,
    when: (x) => x.col.founded && x.col.relations > -10 && x.sim.day - x.col.foundedDay > 16,
    text: () => 'A teacher from the colony asks to teach our children to read, to speak the newcomers’ tongue and to learn their beliefs.',
    options: [
      { label: 'Allow the school', desc: 'The children will go to him each day.', profile: { trad: -0.9, open: 0.9, war: -0.3, caution: 0.2 }, hints: ['+ Relations', '− Language', '+ Newcomer ways'], apply: (x) => { x.cul.flags.school = true; x.col.relations += 10; } },
      { label: 'He may visit, but the children stay with the elders', desc: 'Polite, but firm.', profile: { trad: 0.4, open: 0.4, war: 0, caution: 0.5 }, hints: ['+ Relations (a little)'], apply: (x) => { x.col.relations += 3; } },
      { label: 'Refuse', desc: 'Our children will learn from their grandparents.', profile: { trad: 1, open: -0.6, war: 0.1, caution: 0.2 }, hints: ['+ Respect', '− Relations'], apply: (x) => { x.col.relations -= 6; x.cul.respect += 2; } },
    ],
  });
  issue({
    id: 'close_school', title: 'Children who cannot follow the stories', cooldown: 40, priority: 7,
    when: (x) => x.cul.flags.school && x.cul.trad.language < 0.72,
    text: () => 'The elders say the children who go to the colony school no longer understand the old stories, and some are ashamed of their own names.',
    options: [
      { label: 'Close the school', desc: 'The children come home to the elders.', profile: { trad: 1, open: -0.5, war: 0, caution: 0.2 }, hints: ['+ Language', '− Relations'], apply: (x) => { x.cul.flags.school = false; x.col.relations -= 8; x.cul.trad.language += 0.02; } },
      { label: 'Keep it open', desc: 'They will need the newcomers’ words to deal with them.', profile: { trad: -0.7, open: 0.8, war: 0, caution: 0.3 }, hints: ['− Language'], apply: () => {} },
    ],
  });
  issue({
    id: 'livestock', title: 'Hogs in the corn', cooldown: 36, priority: 5,
    when: (x) => x.col.founded && x.col.pop > 50 && (x.sim.c.season === 0 || x.sim.c.season === 1) && x.cul.rng.chance(0.6),
    text: (x) => `Hogs from ${x.col.name} broke into our fields in the night and rooted up the young corn.`,
    pre: (x) => { x.sim.crop.condition = Math.max(0.05, x.sim.crop.condition - 0.08); },
    options: [
      { label: 'Kill any hogs that come into the fields', desc: 'And eat them.', profile: { trad: 0.3, open: -0.4, war: 0.6, caution: -0.2 }, hints: ['+ Fields protected', '− Relations'], apply: (x) => { x.col.relations -= 12; x.sim.addFood('meat', 30); x.cul.flags.hogs = 1; } },
      { label: 'Demand payment from the colony', desc: 'Send the peace chief to their leader.', profile: { trad: 0.2, open: 0.3, war: 0.1, caution: 0.5 }, hints: ['Maybe goods, maybe anger'], apply: (x) => { if (x.col.relations > 0) { x.cul.integ.goods += 0.02; x.sim.emit(`${x.col.name} paid in kettles and cloth for the damage.`, 'colony'); } else { x.col.relations -= 6; x.sim.emit(`${x.col.name} refused to pay for the damage.`, 'colony'); } } },
      { label: 'Fence the fields and bear it', desc: 'More work, but no quarrel.', profile: { trad: 0, open: 0.5, war: -0.6, caution: 0.6 }, hints: ['− Firewood', '+ Relations'], apply: (x) => { x.sim.stores.wood = Math.max(0, x.sim.stores.wood - 80); x.col.relations += 3; } },
    ],
  });
  issue({
    id: 'sickness', title: 'Sickness in the east', cooldown: 90, priority: 8,
    when: (x) => (x.col.founded || x.col.stage === 'traders') && x.col.contact > 0.4 && x.cul.rng.chance(0.25) && !x.col.epidemicActive,
    text: () => 'A sickness is spreading among the newcomers and the nations to the east: fever, then spots, and many die. Our healers have never seen it.',
    options: [
      { label: 'Close the village to all visitors', desc: 'No traders, no visits, for a moon and more.', profile: { trad: 0.5, open: -0.8, war: 0, caution: 1 }, hints: ['− Trade', '− Relations', 'Much less risk'], apply: (x) => { x.col.closedUntil = x.sim.day + 18; x.col.relations -= 5; } },
      { label: 'Carry on as usual', desc: 'Trade and visits continue.', profile: { trad: 0, open: 0.6, war: 0, caution: -0.8 }, hints: ['High risk of sickness'], apply: (x) => { x.col.contact += 0.5; } },
      { label: 'Send our healers to help', desc: 'It is right to help the sick, whoever they are.', profile: { trad: 0.4, open: 0.7, war: -0.4, caution: -0.6 }, hints: ['+ Relations', '+ Respect', '− Risk of sickness'], apply: (x) => { x.col.relations += 15; x.cul.respect += 2; x.col.contact += 0.3; } },
    ],
  });
  issue({
    id: 'settlers_cross', title: 'Settlers over the line', cooldown: 30, priority: 9,
    when: (x) => x.col.crossed && !x.col.war,
    pre: (x) => { x.col.crossed = false; },
    text: (x) => `Settlers from ${x.col.name} have crossed the agreed boundary and are cutting trees in our hunting woods.`,
    options: [
      { label: 'Burn their cabins', desc: 'A war party will drive them back.', profile: { trad: 0.5, open: -0.8, war: 1, caution: -0.8 }, hints: ['War party', '− Relations'], apply: (x) => { x.col.relations -= 25; x.col.warParty('Driving the settlers back over the boundary'); } },
      { label: 'Protest to the colony', desc: 'The peace chief will demand they keep their word.', profile: { trad: 0.3, open: 0.3, war: 0, caution: 0.7 }, hints: ['They may withdraw'], apply: (x) => { if (x.cul.rng.next() < 0.35 + x.col.relations / 200) { x.col.unclaim(20); x.sim.emit('The colony called its settlers back over the boundary.', 'colony'); } else { x.col.relations -= 5; x.col.setBoundary(x.col.claimed + 20); x.sim.emit('The colony ignored the protest. The boundary has moved.', 'colony'); } } },
      { label: 'Let it go', desc: 'Not worth a war.', profile: { trad: -0.5, open: 0.5, war: -0.8, caution: 0.3 }, hints: ['− Land'], apply: (x) => { x.col.setBoundary(x.col.claimed + 40); x.cul.unity -= 0.02; } },
    ],
  });
  issue({
    id: 'young_warriors', title: 'The young men want to fight', cooldown: 30, priority: 7,
    when: (x) => x.col.founded && !x.col.warPartyActive && (x.col.relations < -15 || x.col.pressure > 0.4),
    text: (x) => `The young men say the newcomers will take everything unless they are stopped. They want to raid the outlying farms of ${x.col.name}.`,
    options: [
      { label: 'Let them go', desc: 'They will burn the nearest farm and return.', profile: { trad: 0.4, open: -0.7, war: 1, caution: -0.8 }, hints: ['War party', '− Relations'], apply: (x) => { x.col.warParty('Raiding the outlying farms'); } },
      { label: 'Forbid it', desc: 'They will be angry.', profile: { trad: 0, open: 0.4, war: -0.8, caution: 0.7 }, hints: ['− Unity'], apply: (x) => { x.cul.unity -= 0.04; } },
      { label: 'Prepare, but wait', desc: 'Train and keep watch.', profile: { trad: 0.2, open: 0, war: 0.4, caution: 0.6 }, hints: ['Leaning: prepare for war'], apply: (x) => { x.cul.lean.defense.t = 1; } },
    ],
  });
  issue({
    id: 'after_attack', title: 'Our lodges burned', cooldown: 8, priority: 10,
    when: (x) => x.col.attackedUs,
    pre: (x) => { x.col.attackedUs = false; },
    text: (x) => `Soldiers from ${x.col.name} came into our village and set lodges on fire. What will we do?`,
    options: [
      { label: 'Strike back', desc: 'A war party will answer fire with fire.', profile: { trad: 0.5, open: -0.8, war: 1, caution: -0.6 }, hints: ['War party'], apply: (x) => { x.col.warParty('Answering the attack on our village'); } },
      { label: 'Raise a palisade', desc: 'Sharpened posts around the village.', profile: { trad: 0.1, open: -0.2, war: 0.4, caution: 0.9 }, hints: ['Builds a palisade'], apply: (x) => { x.cul.flags.palisadeOrdered = true; } },
      { label: 'Seek peace', desc: 'Send the peace chief with a message.', profile: { trad: 0.1, open: 0.7, war: -0.9, caution: 0.5 }, hints: ['Peace, if they will have it'], apply: (x) => { x.col.seekPeace(); } },
    ],
  });
  issue({
    id: 'palisade', title: 'A wall around the village', once: true, priority: 5,
    when: (x) => x.col.founded && (x.cul.lean.defense.v > 0.5 || x.col.war) && !x.cul.flags.palisadeOrdered,
    text: () => 'The war leader asks that we raise a palisade of sharpened posts all around the village.',
    options: [
      { label: 'Build it', desc: 'Everyone will help cut and set the posts.', profile: { trad: 0.1, open: -0.2, war: 0.5, caution: 0.9 }, hints: ['+ Defense', '− Firewood and time'], apply: (x) => { x.cul.flags.palisadeOrdered = true; } },
      { label: 'We are not a fort', desc: 'A wall will not keep the old ways alive.', profile: { trad: 0.4, open: 0, war: -0.4, caution: -0.3 }, hints: [], apply: () => {} },
    ],
  });
  issue({
    id: 'treaty_offer', title: 'An offer of peace', cooldown: 24, priority: 8,
    when: (x) => x.col.war && x.sim.day - x.col.warSince > 14,
    text: (x) => `A messenger comes from ${x.col.name} under a white cloth. They offer peace if we accept a boundary where their farms now end.`,
    options: [
      { label: 'Accept peace', desc: 'The fighting stops. The boundary stands.', profile: { trad: 0.1, open: 0.7, war: -0.9, caution: 0.7 }, hints: ['Peace', 'Boundary'], apply: (x) => { x.col.makePeace(); } },
      { label: 'Fight on', desc: 'They have not given back what they took.', profile: { trad: 0.6, open: -0.7, war: 0.9, caution: -0.5 }, hints: ['War continues'], apply: (x) => { x.cul.respect += 1; } },
    ],
  });
  issue({
    id: 'alliance', title: 'Messengers from the west', once: true, priority: 6,
    when: (x) => x.col.founded && (x.col.war || x.col.pop > 160),
    text: () => 'Messengers from the nations to the west propose an alliance: if the newcomers move against one of us, all will answer.',
    options: [
      { label: 'Join the alliance', desc: 'Our war parties will be stronger, and the colony more wary.', profile: { trad: 0.6, open: -0.6, war: 0.7, caution: 0.3 }, hints: ['+ Strength in war', '− Relations'], apply: (x) => { x.cul.flags.alliance = true; x.col.relations -= 10; x.col.fear += 0.15; } },
      { label: 'Stay apart', desc: 'We will keep our own counsel.', profile: { trad: 0, open: 0.3, war: -0.5, caution: 0.6 }, hints: [], apply: () => {} },
    ],
  });
  issue({
    id: 'marriage', title: 'A newcomer asks to marry', once: true, priority: 4,
    when: (x) => x.col.founded && x.col.relations > 20 && x.sim.day - x.col.foundedDay > 30,
    text: (x) => `A young man of ${x.col.name} asks to marry a woman of our village and live among us, as one of the family.`,
    options: [
      { label: 'Welcome him into the family', desc: 'He will live as we live.', profile: { trad: -0.2, open: 1, war: -0.5, caution: 0 }, hints: ['+ Relations', '+ Newcomer ways'], apply: (x) => { x.col.relations += 10; x.cul.integ.ways += 0.03; x.col.adoptSettler(); } },
      { label: 'She must decide for herself', desc: 'It is her choice and her mother’s.', profile: { trad: 0.3, open: 0.5, war: 0, caution: 0.2 }, hints: [], apply: (x) => { if (x.cul.rng.chance(0.5)) { x.col.relations += 6; x.col.adoptSettler(); } else x.sim.emit('She chose not to marry the newcomer.', 'info'); } },
      { label: 'Refuse', desc: 'Our families are for our people.', profile: { trad: 0.8, open: -0.8, war: 0.2, caution: 0.2 }, hints: ['− Relations'], apply: (x) => { x.col.relations -= 6; } },
    ],
  });
  issue({
    id: 'return_old_ways', title: 'A call to return to the old ways', cooldown: 60, priority: 7,
    when: (x) => x.cul.integ.goods > 0.35 && x.cul.T() < 0.6,
    text: () => 'The elders call for a return to the old ways: to make our own pots, tools and clothing again, and to speak only our own language at the fire.',
    options: [
      { label: 'Yes, we will return to them', desc: 'Families put the trade goods aside.', profile: { trad: 1, open: -0.5, war: 0, caution: 0.2 }, hints: ['+ Crafts', '+ Language', '− Goods'], apply: (x) => { x.cul.lean.ways.t = -1; x.cul.trad.crafts += 0.04; x.cul.trad.language += 0.02; x.cul.integ.goods *= 0.8; } },
      { label: 'We cannot go back', desc: 'Life is easier with iron.', profile: { trad: -0.7, open: 0.7, war: 0, caution: 0.2 }, hints: ['− Unity'], apply: (x) => { x.cul.unity -= 0.03; } },
    ],
  });
  TM.ISSUES = ISSUES;

  // ================================================================== endings
  TM.ENDINGS = {
    endure: { title: 'The People Endure', tone: 'good', text: 'Twelve winters after the strangers first came, the fires still burn in our lodges. The children speak the language of their grandparents, the gatherings are held as they always were, and the land still feeds us. Whatever comes next, we meet it as ourselves.' },
    keepers: { title: 'Keepers of the Fire', tone: 'mixed', text: 'Much of the land is gone under the newcomers’ plows. But the stories are still told, the language is still spoken, and the people know who they are. That knowledge will outlast fences.' },
    withdrew: { title: 'The Newcomers Withdrew', tone: 'good', text: 'Their fort stands empty and their fields are going back to grass. The people held their ground and their ways. The strangers may return one day, but this land remembers who belongs to it.' },
    shared: { title: 'A Shared Land', tone: 'mixed', text: 'Our people and the newcomers live side by side, trading, arguing and sometimes marrying. Much has changed. Some of the old ways live on in the lodges, but many of the young look toward the colony.' },
    faded: { title: 'The Fading', tone: 'bad', text: 'The kettles are iron and the blankets are wool, and the children answer to new names. The old stories are told less each winter, by fewer elders. The people have not vanished, but much of what made them a people has grown quiet.' },
    removed: { title: 'The Land Is Taken', tone: 'bad', text: 'The colony’s farms now reach the edge of our village. The council has decided to move west, beyond the river, carrying what can be carried: the stories, the seeds and the names of the dead.' },
    scattered: { title: 'Scattered', tone: 'bad', text: 'Hunger, sickness and war have taken too many. The survivors have gone to live among relatives in other nations. Some day, perhaps, they will gather again.' },
  };

  // ================================================================== culture state
  class Culture {
    constructor(sim, seed) {
      this.sim = sim;
      this.rng = new RNG((seed ^ 0x77a1) >>> 0);
      this.respect = 14;
      this.trad = { language: 0.96, gatherings: 0.78, crafts: 0.9, land: 1 };
      this.integ = { goods: 0, trade: 0, ways: 0 };
      this.unity = 0.78;
      this.lean = { ways: { t: -1, v: -1 }, newcomers: { t: 0, v: 0 }, hunt: { t: 0, v: 0 }, defense: { t: 0, v: 0 } };
      this.flags = { school: false, spirits: false, guns: 0, palisade: 0, palisadeOrdered: false, alliance: false, cancel: {}, small: {}, huntPush: -1, ration: -1, teach: -1, neighbors: 0 };
      this.done = new Set();
      this.cool = {};
      this.history = [];
      this.storyHours = 0;
      this.craftHours = 0;
      this.gathering = null;
      this.debate = null;
      this.ended = null;
      this.decisions = [];
      this.council = [];
      this.setupCouncil();
    }

    T() { const t = this.trad; return U.clamp(0.3 * t.language + 0.25 * t.gatherings + 0.25 * t.crafts + 0.2 * t.land, 0, 1); }
    I() { const i = this.integ; return U.clamp(0.45 * i.goods + 0.3 * i.trade + 0.25 * i.ways, 0, 1); }

    // ---------------------------------------------------------------- the council
    setupCouncil() {
      const sim = this.sim, rng = this.rng;
      const elders = ['keeper', 'peacemaker', 'keeper', 'pragmatist'];
      let e = 0;
      for (const p of sim.people) {
        if (!p.title) continue;
        let arch = 'pragmatist';
        if (p.title === 'Peace Chief') arch = 'peacemaker';
        else if (p.title === 'Hunt Leader') arch = 'pragmatist';
        else if (p.title === 'Council Elder') arch = elders[e++ % elders.length];
        this.addMember(p, arch);
      }
      const free = (f) => sim.people.filter((p) => !p.title && p.band === 'village' && f(p));
      const war = free((p) => p.sex === 'M' && p.age >= 26 && p.age <= 45).sort(() => rng.next() - 0.5)[0];
      if (war) { war.title = 'War Leader'; this.addMember(war, 'warrior'); }
      const young = free((p) => p.age >= 18 && p.age <= 26).sort(() => rng.next() - 0.5)[0];
      if (young) { young.title = 'Voice of the Young'; this.addMember(young, 'young'); }
    }
    addMember(p, arch) {
      const A = ARCH[arch], rng = this.rng;
      const t = {};
      for (const k in A.t) t[k] = U.clamp(A.t[k] + rng.range(-0.08, 0.08), 0, 1);
      this.council.push({ id: p.id, arch, t, agree: 0 });
    }
    member(id) { return this.council.find((m) => m.id === id); }
    // when a council member dies, the people choose another, shaped by the times
    onDeath(p) {
      const idx = this.council.findIndex((m) => m.id === p.id);
      if (idx < 0) return;
      const old = this.council[idx];
      this.council.splice(idx, 1);
      const sim = this.sim, rng = this.rng;
      const cand = sim.people.filter((q) => !q.title && q.band === 'village' && (q.role === 'elder' || (q.role === 'adult' && q.age > 30)));
      if (!cand.length) return;
      cand.sort((a, b) => b.age - a.age);
      const q = cand[rng.int(0, Math.min(5, cand.length - 1))];
      const T = this.T(), I = this.I(), war = sim.colony && sim.colony.war ? 1 : 0;
      const arch = old.arch === 'warrior' ? 'warrior' : rng.weighted([['keeper', 0.2 + T * 0.8], ['trader', 0.05 + I * 1.1], ['peacemaker', 0.3], ['pragmatist', 0.35], ['warrior', 0.1 + war * 0.5], ['young', 0.1 + I * 0.3]]);
      q.title = p.title === 'Peace Chief' ? 'Peace Chief' : p.title || 'Council Elder';
      this.addMember(q, arch);
      sim.emit(`${q.name} now sits on the council in place of ${p.name}, as ${ARCH[arch].label.toLowerCase()}.`, 'council', q.id);
    }

    // ---------------------------------------------------------------- leanings
    canLean() { return this.respect >= LEAN_COST; }
    setLeaning(key, v, free) {
      const L = this.lean[key];
      if (!L || L.t === v) return false;
      if (!free) {
        if (this.respect < LEAN_COST) return false;
        this.respect -= LEAN_COST;
      }
      L.t = v;
      const opt = TM.LEANINGS.find((l) => l.key === key).opts.find((o) => o[0] === v);
      this.sim.emit(`You speak to the people: “${opt[1]}.” They begin to come round.`, 'council');
      return true;
    }

    // ---------------------------------------------------------------- debates
    ctx() { return { sim: this.sim, cul: this, col: this.sim.colony, nat: this.sim.nature }; }
    pickIssue() {
      const x = this.ctx(), day = this.sim.day;
      const ok = ISSUES.filter((is) => {
        if (is.once && this.done.has(is.id)) return false;
        if (this.cool[is.id] !== undefined && day < this.cool[is.id]) return false;
        try { return !!is.when(x); } catch (e) { return false; }
      });
      if (!ok.length) return null;
      ok.sort((a, b) => b.priority - a.priority);
      const top = ok.filter((is) => is.priority === ok[0].priority);
      return this.rng.pick(top);
    }
    // open a debate: returns the debate object for the interface
    openDebate(is) {
      const x = this.ctx();
      if (is.pre) is.pre(x);
      const members = this.council.map((m) => {
        const p = this.sim.byId.get(m.id);
        const noise = is.options.map(() => this.rng.range(-0.18, 0.18));
        return { m, p, noise };
      }).filter((d) => d.p);
      this.debate = { is, text: is.text(x), members, day: this.sim.day, pick: -1, strength: 0 };
      this.updateDebate();
      return this.debate;
    }
    utility(d, oi) {
      const prof = this.debate.is.options[oi].profile;
      let u = 0;
      for (const k of ['trad', 'open', 'war', 'caution']) u += (2 * d.m.t[k] - 1) * (prof[k] || 0);
      return u + d.noise[oi];
    }
    // recompute each member's vote given the voice you are lending
    updateDebate() {
      const db = this.debate;
      if (!db) return;
      const n = db.is.options.length;
      const tally = new Array(n).fill(0);
      for (const d of db.members) {
        let best = 0, bu = -1e9, base = -1, bb = -1e9;
        for (let oi = 0; oi < n; oi++) {
          const u0 = this.utility(d, oi);
          if (u0 > bb) { bb = u0; base = oi; }
          const u = u0 + (oi === db.pick ? 0.34 * db.strength : 0);
          if (u > bu) { bu = u; best = oi; }
        }
        d.vote = best;
        d.initial = base;
        d.weight = d.p.title === 'Peace Chief' ? 1.5 : 1;
        tally[best] += d.weight;
      }
      db.tally = tally;
      let w = 0;
      for (let oi = 1; oi < n; oi++) if (tally[oi] > tally[w] || (tally[oi] === tally[w] && oi === db.pick)) w = oi;
      db.winner = w;
    }
    setVoice(pick, strength) {
      const db = this.debate;
      if (!db) return;
      db.pick = pick;
      db.strength = Math.max(0, Math.min(3, strength, Math.floor(this.respect / SPEAK_COST)));
      this.updateDebate();
    }
    resolveDebate(force) {
      const db = this.debate;
      if (!db) return null;
      this.updateDebate();
      if (force !== undefined) db.winner = force;
      this.respect -= db.strength * SPEAK_COST;
      const opt = db.is.options[db.winner];
      const x = this.ctx();
      opt.apply(x);
      // going against what most members wanted from the start strains unity
      const against = db.members.filter((d) => d.initial !== db.winner).length;
      if (against > db.members.length * 0.6) this.unity -= 0.03;
      for (const d of db.members) d.m.agree += d.vote === db.winner ? 1 : -1;
      if (db.pick === db.winner && db.strength > 0) this.respect += 1;
      if (db.is.once) this.done.add(db.is.id);
      this.cool[db.is.id] = this.sim.day + (db.is.cooldown || 12);
      this.decisions.push({ day: this.sim.day, cal: this.sim.c, title: db.is.title, choice: opt.label, yours: db.pick === db.winner && db.strength > 0 });
      this.sim.emit(`Council: ${db.is.title}. The council decided: “${opt.label}.”`, 'council');
      this.clampAll();
      const res = { title: db.is.title, label: opt.label, desc: opt.desc, hints: opt.hints, tally: db.tally, winner: db.winner, pick: db.pick };
      this.debate = null;
      return res;
    }
    // used when nobody is there to speak (headless tests)
    autoResolve() {
      const is = this.pickIssue();
      if (!is) return null;
      this.openDebate(is);
      return this.resolveDebate();
    }

    // ---------------------------------------------------------------- gatherings
    nextGathering(within) {
      const c = this.sim.c;
      for (const g of TM.GATHERINGS) {
        if (g.season !== c.season) continue;
        const dayIn = c.moon * TM.C.DAYS_PER_MOON + c.dom, gDay = g.moon * TM.C.DAYS_PER_MOON + g.dom;
        if (gDay >= dayIn && gDay - dayIn <= within) return g;
      }
      return null;
    }
    onNewDay() {
      const c = this.sim.c;
      const g = TM.GATHERINGS.find((q) => q.season === c.season && q.moon === c.moon && q.dom === c.dom);
      this.gathering = null;
      if (!g) return;
      const key = g.id + c.year;
      if (this.flags.cancel[key]) { this.sim.emit(`There is no ${g.name} this year.`, 'warn'); return; }
      const lean = this.sim.foodTotal() / Math.max(1, this.sim.needPerDay()) < 6;
      const small = !!this.flags.small[key] || lean;
      const scale = (small ? 0.5 : 1) * (this.lean.ways.v > 0.5 ? 0.75 : 1);
      this.gathering = { g, scale, kind: g.kind, start: g.kind === 'ball' ? 10 : 18.3, end: g.kind === 'ball' ? 15 : 22.5 };
      const need = this.sim.needPerDay();
      this.sim.eat(need * g.food * scale);
      this.trad.gatherings += g.g * scale;
      if (g.language) this.trad.language += g.language * scale;
      this.unity += 0.05 * scale;
      this.respect += 2;
      this.sim.emit(`${g.name}: ${g.text}`, 'gathering');
      this.clampAll();
    }

    // ---------------------------------------------------------------- daily change
    daily() {
      const sim = this.sim, col = sim.colony;
      const L = this.lean, t = this.trad, I = this.integ, f = this.flags;
      // the people slowly come round to new leanings
      const rate = 0.1 * (0.5 + this.unity);
      for (const k in L) L[k].v += U.clamp(L[k].t - L[k].v, -rate, rate);
      let young = 0;
      for (const p of sim.people) if (p.role === 'child' || p.role === 'youth') young++;
      const teach = U.clamp(this.storyHours / Math.max(4, young * 0.22), 0, 1.6);
      const contact = col ? col.contact : 0;
      // a language fades over generations, not seasons
      t.language += 0.005 * (teach - 0.55) - 0.0012 * (I.ways + contact * 0.5) - (f.school ? 0.0028 : 0) + (L.ways.v < -0.5 ? 0.0012 : 0) + (sim.day < f.teach ? 0.002 : 0);
      t.gatherings -= 0.0035 * (L.ways.v > 0.5 ? 1.5 : 1) + 0.003 * I.ways;
      const craftRef = Math.max(10, sim.people.length * 0.22);
      const goodsUse = I.goods * (L.ways.v > 0.5 ? 1.4 : L.ways.v < -0.5 ? 0.6 : 1);
      t.crafts += 0.005 * (U.clamp(this.craftHours / craftRef, 0, 1.4) - 0.85) - 0.007 * goodsUse;
      t.land = col ? col.landShare() : 1;
      // goods wear out when trade stops; dependence grows as crafts fade
      const access = col ? col.tradeAccess() : 0;
      I.goods -= access > 0.5 ? 0.0006 : 0.0018;
      I.trade += 0.03 * (I.goods * (1.15 - t.crafts) - I.trade);
      I.ways += (f.school ? 0.006 : 0) + contact * 0.002 - 0.0012 * (L.ways.v < 0 ? 2 : 1);
      // unity follows how whole the people feel
      const fd = sim.foodTotal() / Math.max(1, sim.needPerDay());
      const target = 0.3 + 0.5 * this.T() + (fd > 6 ? 0.12 : -0.1) - (f.spirits ? 0.12 : 0) - (col && col.war ? 0.05 : 0) - (col ? col.recentLoss : 0);
      this.unity += U.clamp(target - this.unity, -0.03, 0.03);
      if (col && col.war) this.unity -= 0.002;
      this.respect += 0.55 + 0.95 * this.T();
      // the palisade goes up while it is ordered
      if (f.palisadeOrdered && f.palisade < 1) f.palisade = Math.min(1, f.palisade + 0.004); // mostly raised by work in the village
      this.storyHours = 0;
      this.craftHours = 0;
      this.clampAll();
      this.history.push({ day: sim.day, T: this.T(), I: this.I(), language: t.language, gatherings: t.gatherings, crafts: t.crafts, land: t.land, unity: this.unity });
      if (this.history.length > 700) this.history.shift();
      this.checkEnding();
    }
    clampAll() {
      for (const k in this.trad) this.trad[k] = U.clamp(this.trad[k], 0, 1);
      for (const k in this.integ) this.integ[k] = U.clamp(this.integ[k], 0, 1);
      this.unity = U.clamp(this.unity, 0, 1);
      this.respect = U.clamp(this.respect, 0, 40);
    }

    // ---------------------------------------------------------------- effects on daily life
    workMul(act) {
      const col = this.sim.colony;
      const access = col ? col.tradeAccess() : 0;
      const tool = act === 'farm' || act === 'wood' || act === 'build' || act === 'craft' ? 0.25 : act === 'hides' ? 0.15 : 0;
      const boost = 1 + tool * this.integ.goods * access;
      const lost = 1 - 0.35 * this.integ.trade * (1 - access);
      return (0.88 + 0.24 * this.unity) * boost * lost;
    }
    huntMul() {
      const col = this.sim.colony;
      const access = col ? col.tradeAccess() : 0;
      const guns = this.flags.guns;
      return this.workMul('hunt') * (1 + 0.3 * guns * access) * (1 - 0.2 * guns * (1 - access));
    }
    illnessMul() { return 1.3 - 0.55 * this.T(); }

    // ---------------------------------------------------------------- endings
    checkEnding() {
      if (this.ended) return;
      const sim = this.sim, col = sim.colony;
      let id = null;
      if (sim.people.length < 40) id = 'scattered';
      else if (col && col.stage === 'abandoned') id = 'withdrew';
      else if (this.trad.land < 0.12) id = 'removed';
      else if (this.T() < 0.2) id = 'faded';
      else if (sim.c.year >= TM.ENDING_YEAR) {
        const T = this.T(), land = this.trad.land;
        if (T >= 0.62 && land >= 0.55) id = 'endure';
        else if (T >= 0.55) id = 'keepers';
        else if (col && col.relations >= 30 && T >= 0.4) id = 'shared';
        else id = 'faded';
      }
      if (id) {
        this.ended = { id, day: sim.day, year: sim.c.year, T: this.T(), I: this.I(), land: this.trad.land, pop: sim.people.length };
        if (this.onEnding) this.onEnding(this.ended);
      }
    }
  }

  TM.Culture = Culture;
})();
