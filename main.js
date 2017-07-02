/*
  ALttP Bot
*/

var request = require('request');
var irc = require('irc');

// Import the discord.js module
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client();

// The token of your bot - https://discordapp.com/developers/applications/me
const token = 'MzMwNzgwOTYyODMxMjA0MzU0.DDl_wQ.DpHi2WusYtMKYyyo24o1HgqFHdg';

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
  console.log('I am ready!');

  // Let the world know we're here
  var alertsChannel = client.channels.find('name', 'alttp-alerts');
  alertsChannel.send('Bot has connected. :white_check_mark:');

  // Update and Output the intial list of live streams, then set a timer to update
  var liveStreamIds = [];

  setInterval(updateStreams, 60000);
  listenForSRLRaces("The Legend of Zelda: A Link to the Past");

  function updateStreams()
  {
    findLiveStreams(handleStreamResults);
  }

  function handleStreamResults(streams)
  {
    var newLiveStreamIds = [];
    if (streams !== false)
    {
      streams.forEach(function(stream)
      {
        if (liveStreamIds.indexOf(stream._id) === -1) {
          alertsChannel.send('**NOW LIVE** :: ' + stream.channel.url + ' :: *' + stream.channel.status + '*');
        }
        newLiveStreamIds.push(stream._id);
      });
      // @todo eventually check for title differences and edit previous message
    }
    liveStreamIds = newLiveStreamIds;
  }

  // Connect to Twitch to pull a list of currently live streams for ALttP
  // Attempt to automatically filter out non-speedrun streams
  function findLiveStreams(cb)
  {
    var game = "The Legend of Zelda: A Link to the Past";
    var channels = [
      "xelna","wqqqqwrt","apparentlyplant","bluntbunny","poor_little_pinkus",
      "timmon_","joedamillio","yungedde","acmlm","pui_","andy","waffle42",
      "superskuj","ajneb174","xreleased","miketheviewer","kevin_force",
      "chrillepan","caznode","christosowen","tgh_plays","shadows4511","dbzfankidboo",
      "greenham83","rpgodfather420","salatmann92","tannaplg","dudebrosick",
      "thesabin","evilash25","i_smoke_meth_daily69","v0oid","parisianplayer",
      "zoasty","screevo","zockerstu","kolthor_thebarbarian","muttski","greffery",
      "clintbeastwooddd","zheal","theokayguy","kanisrollsdeep","blank_42","realjayhawk",
      "emetatron","walrus_prime","maltzi","skarsnikus","mishrak109","mchan338",
      "z4t0x","tbham","sleepynicholas","sneschalmers_","hcfwesker","thalietm",
      "jake57689","squibbons","toiletsalesman1","alexis2pro","drock91384","revolver005",
      "bob_loblaw_law","link_is_not_zelda_","komatsu_nico","tm9001","thezeldachapter",
      "deadrun24","darth_lunchbox","tairr","kinghippo423","blueviper85","darkmagician1184",
      "barnowl","runnerwatcher","brahminmeat","mustackk","kryssstal",
      "politemaster","greenlinenshirt","xatherusx","jaysee87"
    ];
    var statusFilters = /rando|lttpr|z3r|casual/i
    var searchReq = {
      url: 'https://api.twitch.tv/kraken/streams?limit=100&game='+encodeURIComponent(game)+'&channel='+encodeURIComponent(channels.join()),
      headers: {
        'Client-ID': 'p000sp5q14fg2web0dx71p9fbmx5m9'
      }
    };
    var searchHandler = function (error, response, body) {
      if (!error && response.statusCode == 200)
      {
        var info = JSON.parse(body);
        if (info._total > 0)
        {
          //console.log("Found " + info._total + " live streams -- filtering...");
          var filteredStreams = info.streams.filter(function (item) {
            return !(statusFilters.test(item.channel.status));
          });
          //console.log("Found " + filteredStreams.length + " live streams after filtering.");
          cb(filteredStreams);
        }
      } else {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        cb(false);
      }
    }
    //console.log("Searching Twitch for live streams of " + game);
    request(searchReq, searchHandler);
  }

  // Connect via IRC to SRL and listen for races
  function listenForSRLRaces(gameName)
  {
    var client = new irc.Client('irc.speedrunslive.com', 'alttpracewatcher', {
      channels: ['#speedrunslive'],
    });
    client.addListener('message#speedrunslive', function (from, message) {
      if (from === 'RaceBot')
      {
        console.log(message);

        var raceChannel = message.match(/srl\-([a-z0-9]{5})/);
        if (message.startsWith('Race initiated for ' + gameName + '. Join'))
        {
          //var gameName = message.match(/initiated for (.+)\. Join/);
          alertsChannel.send('**SRL Race Started** :: *#' + raceChannel[0] + '* :: A race was just started for ' + gameName + '!');
        }
        else if (message.startsWith('Goal Set: ' + gameName + ' - '))
        {
          var goal = message.match(/\-\s(.+)\s\|/);
          alertsChannel.send('**SRL Race Goal Set** :: *#' + raceChannel[0] + '* ::  __' + goal[1] + '__');
        }
        else if (message.startsWith('Race finished: ' + gameName + ' - '))
        {
          //var gameName = message.match(/Race finished:\s(.+)\s\-/);
          var goal = message.match(/\-\s(.+)\s\|/);
          alertsChannel.send('**SRL Race Finished** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__');
        }
        else if (message.startsWith('Rematch initiated: ' + gameName + ' - '))
        {
          //var gameName = message.match(/Rematch initiated:\s(.+)\s\-/);
          var goal = message.match(/\-\s(.+)\s\|/);
          alertsChannel.send('**SRL Rematch** :: *#' + raceChannel[0] + '* :: __' + goal[1] + '__');
        }
      }
    });
  }
});

// Create an event listener for messages
client.on('message', message => {
  // allow members to request role additions/removals for @nmg-race and @100-race on the alttp discord
  if (message.content.startsWith('!addrole')) {
    // parse+validate role name
    var roleName = message.content.match(/\!addrole\s([a-z0-9\-]+)/);
    if (/nmg\-race|100\-race/.test(roleName[1]))
    {
      var role = message.guild.roles.find('name', roleName[1]);
      message.member.addRole(role)
        .then(requestingMember => {
          message.channel.send("You have successfully been added to the " + roleName[1] + " group!", {reply: requestingMember})
        })
        .catch(console.log);
    }
    else
    {
      message.channel.send("Invalid role name!", {reply: message.member});
    }
  }

  // Definitions / Help / Links
  if (message.content === '!airpumping') {
    message.channel.send("Much like wall pumping, air pumping will reset Link's movement pattern with every \"pump\". The pattern for moving north or west is 2-1-2-1-... and the diagonal movement speed is 1px/frame. So, as an example, going north and pumping west (or east) every other frame would result in a 2North-1Diagonal-2North-1Diagonal-... movement.");
  }

  if (message.content === '!antipumping') {
    message.channel.send("Exactly the same as Wall Pumping or Air Pumping, but this happened when you accidentally do an air/wall pump while Link is facing East or South. Instead of changing 2-1-2-1-2-1 to 2-2-2-2-2-2, it changes your walk pattern from 1-2-1-2-1-2-1-2 to 1-1-1-1-1-1-1-1.");
  }

  if (message.content === '!bb') {
    message.channel.send("Blue balls (bb) refers to an attack Agahnim makes. This attack is undesired since it can't be repelled back at him, unlike the yellow ball (yb) attack. The first Agahnim fight consists of repeating cycles of the following five attacks: 1.[yb] 2.[yb or bb] 3.[yb or bb] 4.[yb or bb] 5.[lightning]. Agahnim is defated after being hit by 6 yellow balls.");
  }

  if (message.content === '!bb%') {
    message.channel.send("Blue Ball probabilities: [2cyc=34.375% - 0bb: 6.25% - 1bb: 12.5% - 2bb: 15.625%] [3cyc=56.640625% - 3bb: 31.25% - 4bb: 11.71875% - 5bb: 8.203125% - 6bb: 5.46875%] [4cyc=8.666992% - 7bb: 7.03125% - 8bb: 0.878906% - 9bb: 0.488281% - 10bb: 0.268555%] [5cyc=0.314331% - 11bb: 0.292969% - 12bb: 0.012207% - 13bb: 0.006103% - 14bb: 0.003052%] [6cyc=0.003052% - 15bb: 0.003052%]");
  }

  if (message.content === '!blockerase') {
    message.channel.send("Using the mirror while pushing a block will make it disappear. You need to be indoors but NOT in a dungeon for it to work. This minor glitch is most commonly used in the swamp dam in light world. JP v1.0 only.");
  }

  if (message.content === '!discord') {
    message.channel.send("If you're interested in speedrunning ALttP or discussing it with us, feel free to join the community discord: https://discordapp.com/invite/3Bsfnwk");
  }

  if (message.content === '!eg') {
    message.channel.send("EG means Exploration Glitch. The glitch allows you to walk on the incorrect layer and thereby pass through anything. With EG, the game can be completed within 2 minutes.");
  }

  if (message.content === '!ff') {
    message.channel.send("Fake flippers, a glitch which allows you to swim without having the flippers. It is performed by jumping into water and changing screen just as you hit the water. Leaving the water will end the glitch, and taking damage whilst swimming can result in the infinite scroll glitch. JP v1.0 only.");
  }

  if (message.content === '!ganontut') {
    message.channel.send("Comprehensive Ganon tutorial with Trident spin tut by pinkus + tempered and gold sword strats by timmon_: https://www.dropbox.com/s/yyzml0hs75hgoor/hybrid-ganon-tut-pinkus-timmon.mp4?dl=0");
  }

  if (message.content === '!glitchtuts') {
    message.channel.send("A comprehensive set of tutorial videos made by superSKUJ covering a variety of glitches in ALttP including basic wall clipping, DMA, DMD, Cane of Somaria glitches and more: https://www.youtube.com/playlist?list=PLPsUbwi58oG_hjrgq1wpYmM3JMEn9b8R8");
  }

  if (message.content === '!hack' || message.content === '!practice' || message.content === '!prachack') {
    message.channel.send("Practice hack for ALttP by pinkus: http://milde.no/lttp/");
  }

  if (message.content === '!hammeryump') {
    message.channel.send("A bomb jump trick in Palace of Darkness that skips a large portion of the dungeon. Tutorial by bluntbunny here: https://www.youtube.com/watch?v=IMqqGzU_eo0");
  }

  if (message.content === '!hover') {
    message.channel.send("Hovering over gaps is performed by holding the A button (for up to 31 frames), releasing it for one frame, and repressing it the next frame. ie: (Release A)(Move for one frame)(Press A)[repeat]. If the A button is held or released for too long you will fall!");
  }

  if (message.content === '!hovertut') {
    message.channel.send("Hover tutorial by malibukenn: https://www.youtube.com/watch?v=XraSVjZYXR0");
  }

  if (message.content === '!ipbj') {
    message.channel.send("The bomb jump performed in Ice Palace which skips a large portion of the dungeon. Guide by wqqqqwrt: https://www.youtube.com/watch?v=N6mD9YM8m7Q");
  }

  if (message.content === '!itemdash') {
    message.channel.send("By hitting both the Y-button and the A-button on the same frame, one can perform a dash where the currently equipped item is activated throughout the dash. The most commonly used itemdash is the hammerdash. JP v1.0 only.");
  }

  if (message.content === '!jamiroquai' || message.content === '!jamtut') {
    message.channel.send("GTower Skip Tutorial / Mirror on Conveyor + Somaria: https://www.twitch.tv/videos/117750046");
  }

  if (message.content === '!jp') {
    message.channel.send("Japanese 1.0 is the version of ALttP most commonly used for speedrunning since the Japanese version contains less text (saves ~1 minute), and a few minor glitches like fake flippers, item dash, and superspeed only exist in version 1.0 (saves ~30-40s).");
  }

  if (message.content === '!keydash') {
    message.channel.send("A keydash can be performed by initiating a dash a multiple of 4 pixels away from a locked door. Positioning yourself against an opposing wall before starting the dash, or nudging an object whilst dashing, will both automatically align you properly.");
  }

  if (message.content === '!lanmo') {
    message.channel.send("Lanmo Tips 'n' Tricks: https://pastebin.com/Y45gaDqv");
  }

  if (message.content === '!lb') {
    message.channel.send("http://www.speedrun.com/alttp");
  }

  if (message.content === '!low%') {
    message.channel.send("Low%: Beat the game using the minimal items required to finish the game. This means no extra items or hearts that the game already does not force you to obtain. That means, yes, if you grab the Magic Mushroom, you have to reset (or get rid of it at the Witch's Hut). It is possible to defeat Ganon with only the Master Sword but requires a beefy 52 spins (Master Sword slashes do not damage Ganon).");
  }

  if (message.content === '!mothtut') {
    message.channel.send("tiny moth dik: https://www.youtube.com/watch?v=qmR3zO2VQCE");
  }

  if (message.content === '!nmg') {
    message.channel.send("NMG is short for No Major Glitches and means that glitches that skip a large chunk of the game, such as EG and OOB, are not allowed. More information on glitch classifications can be found here: http://pastebin.com/bb0vHjcm");
  }

  if (message.content === '!oob') {
    message.channel.send("Out of Bounds (abbreviated OoB) means leaving the intended confinements of the playing field. The most powerful/broken Out of Bounds state is EG (Exploration Glitch).");
  }

  if (message.content === '!pinkustips') {
    message.channel.send("Some excellent tips from pinkus that most tutorials don't cover: https://gist.github.com/helgefmi/2c2652effb31e0ee0a4e0c48440fd4ee");
  }

  if (message.content === '!prizepacks') {
    message.channel.send("The order of items in which certain groups of enemies will drop, supposing the enemy decides to drop something upon dead. Killing an enemy with a dash does not advanced the prizepack. For more info, see: http://imgur.com/a/FOO65");
  }

  if (message.content === '!qw' || message.content === '!quickwarp') {
    message.channel.send("Quickwarps: With the camera aligned to the correct horizontal pixel when initiating a mirror warp or entering a warp tile, the warp animation can be shortened by 34 frames. More info here: https://alttp-wiki.net/index.php/Quick_Warps");
  }

  if (message.content === '!randodiscord') {
    message.channel.send("lol");
  }

  if (message.content === '!resources') {
    message.channel.send("https://alttp-wiki.net/index.php/Tutorials_and_other_external_resources");
  }

  if (message.content === '!rbo') {
    message.channel.send("Reverse Boss Order is a category in which you defeat all bosses in the reverse order, all the way from Ganon to Armos Knight. The run ends, as usual, when collecting the Triforce. The category requires frequent use of larger glitches such as EG and YBA.");
  }

  if (message.content === '!snq' || message.content === '!sq' || message.content === '!s+q') {
    message.channel.send("S+Q means Save and Quit and can be used to minimize overworld travel. With so many other categories that allow heavy sequence breaking, the community at large has decided to not allow S+Q in an NMG speedrun simply to include more content of the game that most other categories skip.");
  }

  if (message.content === '!spindash') {
    message.channel.send("By releasing a sword spin and pressing the A-button the first frame after release, Link will be put into a glitched state and cannot use his sword. If you touch manual stairs and exit cardinally, Link will move at dashing speed with the ability to change directions. Just as with hookdash, pressing A, taking damage, changing screen, or jumping off a ledge will end the glitched state. JP v1.0 only.");
  }

  if (message.content === '!srcguides') {
    message.channel.send("http://www.speedrun.com/alttp/guides");
  }

  if (message.content === '!stairlag') {
    message.channel.send("When exiting a staircase, Link will walk in place for a short period of time unless you hold LEFT or RIGHT during the first frame or 2 (depending on directions) after the stairwell animation.");
  }

  if (message.content === '!superspeed') {
    message.channel.send("By having a medallion or hookshot equipped and hitting the Y-button and the A-button at the same frame (or using a spindash), you activate a glitched walking state. By climbing stairs that you can manually move up and down and exiting them cardinally, you will gain dash speed while walking. This activated state is called superspeed. The effect is active until canceled by pressing the A-button, taking damage, changing screen, or jumping off a ledge. JP v1.0 only.");
  }

  if (message.content === '!swordbuffer') {
    message.channel.send("Sword Buffering is performed by pressing a direction and pressing B the next frame. Since using your sword will interrupt all D-Pad inputs it allows you to hold the dpad for longer than 1 frame but you move for only 1 frame if executed properly.");
  }

  if (message.content === '!swordclimb') {
    message.channel.send("By holding out the sword first then performing a hookdash (itemdash with hookshot) on stairs you will be able to climb the stairs with the same speed as walking whilst holding out the sword on flat ground. If the sword spin is released before exiting the stairs, you will also have superspeed afterwards. JP v1.0 only.");
  }

  if (message.content === '!trident') {
    message.channel.send("Avoiding the trident in Ganon Phase 1 by poor_little_pinkus: https://www.youtube.com/watch?v=pmlsW1M6leo");
  }

  if (message.content === '!wallpumping') {
    message.channel.send("When walking in a straight line, Link's movement speed is alternated between 1px and 2px per frame. Furthermore, when walking north or west and up against a wall, continuously hitting a directional button towards the wall can increase the movement speed. The movement pattern for north or west is 2-1-2-1-.. and will be reset with every \"pump\". Thereby, successfully pumping every frame will completely replace 1px movements with 2px movements (ie: 2-2-2-2-2-2... instead of 2-1-2-1-2-1-2-1...)");
  }

  if (message.content === '!wiki') {
    message.channel.send("http://www.alttp-wiki.net/index.php/Main_Page");
  }

  if (message.content === '!wqvitty') {
    message.channel.send("Tutorial by JoeDamillio covering the WQ Vitty Strat: https://youtu.be/dJUnf4D0_zQ?t=249");
  }

  if (message.content === '!yba') {
    message.channel.send("Yuzuhara's Bottle Adventure (YBA) is a glitch that involves using a potion the same frame as you initiate a screen transition to manipulate the memory. Different locations and potions can have different effects such as screen warps or accessing the flute menu without actually having the flute (even in the dark world).");
  }

  // Highlights+Memes
  if (message.content === '!69blazeit') {
    message.channel.send("https://www.twitch.tv/greenham83/v/83767030");
  }

  if (message.content === '!armface') {
    message.channel.send("https://www.twitch.tv/videos/48994119");
  }

  if (message.content === '!birdtoss') {
    message.channel.send("https://www.twitch.tv/videos/57872039");
  }

  if (message.content === '!clap') {
    message.channel.send("https://clips.twitch.tv/HumbleBumblingPlumageDancingBanana");
  }

  if (message.content === '!clipclap') {
    message.channel.send("https://clips.twitch.tv/BashfulMistyVelociraptorBrainSlug");
  }

  if (message.content === '!clipirl') {
    message.channel.send("How to Clip IRL by Muttski: https://www.youtube.com/watch?v=GmbQZ6u32_0");
  }

  if (message.content === '!dildo') {
    message.channel.send("https://clips.twitch.tv/greenham83/HealthyYakTheRinger");
  }

  if (message.content === '!doubleteam') {
    message.channel.send("https://www.youtube.com/watch?v=A4Sjhj_Tshc");
  }

  if (message.content === '!firstdigflute') {
    message.channel.send("https://www.youtube.com/watch?v=uHjEP_77PK0");
  }

  if (message.content === '!ganondik') {
    message.channel.send("https://clips.twitch.tv/christosowen/WrongHerringSuperVinlin");
  }

  if (message.content === '!gonnabeme') {
    message.channel.send("https://clips.twitch.tv/CogentSquareHornetBabyRage");
  }

  if (message.content === '!illbefine') {
    message.channel.send("https://www.youtube.com/watch?v=nzgAln6nXOw");
  }

  if (message.content === '!kholdstare') {
    message.channel.send("https://www.twitch.tv/videos/49702547");
  }

  if (message.content === '!middlehole') {
    message.channel.send("https://www.twitch.tv/videos/43054860");
  }

  if (message.content === '!mothhole') {
    message.channel.send("https://clips.twitch.tv/TentativeFaithfulWalrusTwitchRPG");
  }

  if (message.content === '!mothtut2') {
    message.channel.send("https://www.twitch.tv/xreleased/v/83532283");
  }

  if (message.content === '!pissonface') {
    message.channel.send("https://www.twitch.tv/runnerwatcher/v/42127159");
  }

  if (message.content === '!playmario') {
    message.channel.send("https://www.twitch.tv/videos/45723591");
  }

  if (message.content === '!psa') {
    message.channel.send("https://www.youtube.com/watch?v=7bpZgjXGesM");
  }

  if (message.content === '!rapbattle') {
    message.channel.send("http://pastebin.com/f9a0A8DK");
  }

  if (message.content === '!sobesmooth') {
    message.channel.send("\"my strategy was to use warps\" - http://pastebin.com/s1JG5D1U");
  }

  if (message.content === '!thebee') {
    message.channel.send("https://youtu.be/lA-h232zy84");
  }

  if (message.content === '!thewobble') {
    message.channel.send("https://www.youtube.com/watch?v=J0k4BE8hQWA");
  }

  if (message.content === '!thirtyseven') {
    message.channel.send("I just wanna hit Ganon! :'(  http://www.youtube.com/watch?v=uf4CClO18Q4");
  }

  if (message.content === '!trolldorm') {
    message.channel.send("https://www.youtube.com/watch?&v=LTrf2vHDrw4");
  }

  if (message.content === '!uhoh') {
    message.channel.send("UH OH!!: https://www.youtube.com/watch?v=Nllqiar7cSk");
  }

  if (message.content === '!wafflehouse') {
    message.channel.send("https://www.twitch.tv/videos/45723591");
  }

  if (message.content === '!whatagod') {
    message.channel.send("https://www.twitch.tv/videos/76518228");
  }

  if (message.content === '!zeldagamer') {
    message.channel.send("https://www.youtube.com/watch?v=48eMTIYpKeo");
  }
});

// Log our bot in
client.login(token);