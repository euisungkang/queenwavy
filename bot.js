const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require("discord.js");
const database = require("./firebaseSDK");
const cron = require("node-cron");
const raffle = require("./raffle.js");
const team = require("./team.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions
  ],
});

client.login(process.env.BOT_TOKEN_QW);

client.on("ready", async () => {
  console.log("help im in heroku");

  purgeAlts()

  // client.user.setActivity("$help", { type: "LISTENING" });
  client.user.setPresence({
    activities: [{ name: "$help", type: ActivityType.Listening }],
  });

  //Command channel
  //let channel = await client.channels.fetch('794722902003941417')

  let raffle_channel = await client.channels.fetch("962308831944265768");
  let raffle_logs = await client.channels.fetch("961870235542106162");
  let raffle_winner = await client.channels.fetch("962365291109707797");

  // let status_msg = await raffle_channel.messages.fetch('962309541477875712')
  // status_msg.edit("__**Raffle Status: **__\n```diff\n- Offline\n```")

  raffle.initializeRaffle(
    raffle_channel,
    raffle_logs,
    raffle_winner,
    sendMessage
  );

  // Teams Channel ID: 1028295941188501525

  let team_channel = await client.channels.fetch("1028295941188501525");

  team.initializeTeam(team_channel);
});

// Purge alts every hour
cron.schedule("20 * * * *", () => {
  purgeAlts();
});

//Reset monthly coins
cron.schedule("00 0 1 * *", () => {
  database.resetMonthlyCoins();
});

let prefix = "$";

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.trim().split(/ +/g);
  const cmd = args[0].slice(prefix.length).toLowerCase();

  if (cmd == "wallet") {
    walletCommand(message);
  } else if (cmd == "disable") {
    disableReceipts(message);
  } else if (cmd == "enable") {
    enableReceipts(message);
  } else if (cmd == "give") {
    giveCommand(args, message);
  } else if (cmd == "help") {
    helpCommand(message);
  }
});

client.on("voiceStateUpdate", async (oldMember, newMember) => {
  let { id } = oldMember;

  let oldUserChannel = oldMember.channel;
  let newUserChannel = newMember.channel;

  // If user enters a channel for the first time
  if (oldUserChannel == null && newUserChannel != null && !(await isBot(id))) {
    // Category ID of arcade: 687839393444397111
    // Category ID of Wavy: 816565807693824031
    if (await channelIsValid(newUserChannel)) {
      database.setTimeJoined(oldMember.member.user);

      //console.log('Joined Channel: ' + newMember.member.user.username)
    }

    // If user exits channels
  } else if (
    oldUserChannel != null &&
    newUserChannel == null &&
    !(await isBot(id))
  ) {
    if (await channelIsValid(oldUserChannel)) {
      calculateTimeSpent(oldMember, oldUserChannel.parentId);
    }

    // Moving between channels
  } else if (
    oldUserChannel != null &&
    newUserChannel != null &&
    !(await isBot(id))
  ) {
    //console.log("moving")

    // Category ID of arcade: 687839393444397111

    // If moving from valid to non-valid channel
    if (
      (await channelIsValid(oldUserChannel)) &&
      !(await channelIsValid(newUserChannel))
    ) {
      calculateTimeSpent(oldMember, oldUserChannel.parentId);
      // If moving from non-valid to valid channel
    } else if (
      !(await channelIsValid(oldUserChannel)) &&
      (await channelIsValid(newUserChannel))
    ) {
      database.setTimeJoined(oldMember.member.user);
    }

    // General and Private VC condition
    // else if ((await channelIsValid(oldUserChannel) && await channelIsValid(newUserChannel)) &&
    //           ((oldUserChannel.parentID == '687839393444397111' && newUserChannel.parentID == '816565807693824031') ||
    //            (oldUserChannel.parentID == '816565807693824031' && newUserChannel.parentID == '687839393444397111'))) {
    //     await calculateTimeSpent(oldMember, oldUserChannel.parentID);
    //     database.setTimeJoined(oldMember.member.user)
    //     console.log("Switched to " + oldUserChannel.parentID + " : " + newMember.member.user.username)
    // }
  }
});

async function errorMessage(message, m) {
  let err = await message.reply(m);
  const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
  await wait(3000);
  err.delete();
  message.delete();
}

async function helpCommand(message) {
  let replyChannel = await client.channels.fetch(message.channel.id);

  let embed = new EmbedBuilder()
    .setColor("#ff6ad5")
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Bot Commands")
    .setThumbnail(
      "https://cdn.discordapp.com/app-icons/812904867462643713/c3713856eae103c4cad96111e26bce21.png?size=512"
    )
    .addFields(
      {
        name: "$guide",
        value:
          "Guide to important channels. Use if you have questions or are new",
      },
      { name: "$wallet", value: "Tells you how many coins you have" },
      { name: "$edit", value: "Allows you to edit/upgrade purchased <#820051777650556990> products" },
      {
        name: "$give <@recipient> <amount>",
        value: "Transfer coins to others. **Don't include <> on use**",
      },
      {
        name: "$enable",
        value:
          "Enables DM coin receipts after every voice channel session: *default*",
      },
      {
        name: "$disable",
        value: "Disables DM coin receipts after every voice channel session",
      }
    )
    .setFooter({
      text: "Type commands in any  𝓦 𝓪 𝓿 𝔂  text channel",
    });

  return await replyChannel.send({ embeds: [embed] });
}

async function giveCommand(args, message) {
  console.log(args);
  if (!args[2] || args[3]) {
    errorMessage(message, "Incorrect number of arguments.");
    return;
  }

  let ID = await args[1].match(/(\d+)/);
  if (ID == null) {
    errorMessage(
      message,
      "Invalid user to send <:HentaiCoin:814968693981184030>"
    );
    return;
  }

  let user = await client.users.fetch(ID[0]).catch((err) => {
    return null;
  });
  let source = await client.users.fetch(message.author.id).catch((err) => {
    return null;
  });
  let amount = parseInt(args[2]);

  if (user == null || source == null) {
    errorMessage(
      message,
      "Invalid user to send <:HentaiCoin:814968693981184030>"
    );
    return;
  } else if (isNaN(amount) || amount < 0) {
    errorMessage(message, "Please enter a valid number :unamused:");
    return;
  } else if (amount == 0) {
    errorMessage(message, "No");
    return;
  } else if (user.id == source.id) {
    errorMessage(
      message,
      "Can't sent money to yourself <:PepeWHAT:813130771799081030> <:PepeWHAT:813130771799081030> <:PepeWHAT:813130771799081030>"
    );
    return;
  }

  let wallet = await database.getCurrency(ID[0]);
  let wallet2 = await database.getCurrency(message.author.id);

  if (amount > wallet2) {
    errorMessage(
      message,
      "You don't have enough <:HentaiCoin:814968693981184030> to send that much <:PepeWHAT:813130771799081030>"
    );
    return;
  }

  database.removeCurrency(source, amount);
  database.addCurrency(user, amount);

  let embed = new EmbedBuilder()
    .setColor("#ff6ad5")
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Transaction Record")
    .setThumbnail("https://i.ibb.co/5kL7hBD/Wavy-Logo.png")
    .setDescription(
      source.username +
        " has sent you " +
        amount +
        " <:HentaiCoin:814968693981184030>\nYour balance is now " +
        (wallet + amount) +
        " <:HentaiCoin:814968693981184030>"
    );

  let embed2 = new EmbedBuilder()
    .setColor("#ff6ad5")
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Transaction Record")
    .setThumbnail("https://i.ibb.co/5kL7hBD/Wavy-Logo.png")
    .setDescription(
      "You sent " +
        user.username +
        " " +
        amount +
        " <:HentaiCoin:814968693981184030>\nYour balance is now " +
        (wallet2 - amount) +
        " <:HentaiCoin:814968693981184030>"
    );

  user.send({ embeds: [embed] });
  source.send({ embeds: [embed2] });

  let log = await client.channels.fetch("826499502403747921");
  log.send(
    "Source: " +
      source.username +
      "   to " +
      user.username +
      "     amount: " +
      amount
  );

  message.delete();
}

async function walletCommand(message) {
  let wallet = await database.getCurrency(message.author.id);
  let cum = await database.getCum(message.author.id);

  var today = new Date();

  var date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
  //var time = today.getHours() + ":" + today.getMinutes();

  let embed = new EmbedBuilder()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Wallet")
    .setThumbnail("https://i.ibb.co/5kL7hBD/Wavy-Logo.png")
    .setDescription(
      "*Date: " +
        date +
        "*\n\nYour **monthly** coins: " +
        wallet +
        " <:HentaiCoin:814968693981184030>" +
        "\nYour **cumulative** coins: " +
        cum +
        " <:HentaiCoin:814968693981184030>"
    );

  message.author.send({ embeds: [embed] });

  message.delete();
}

async function isBot(id) {
  let user = await client.users.fetch(id);
  return user.bot;
}

async function channelIsValid(channel) {
  // Arcade: 687839393444397111
  // Wavy: 816565807693824031
  // Study: 809345799526809600
  // AFK: 814930846326456420

  let valid =
    (channel.parentId == "687839393444397111" ||
      channel.parentId == "816565807693824031") &&
    channel.id != "809345799526809600" &&
    channel.id != "814930846326456420";

  return valid;
}

async function calculateTimeSpent(oldMember, channelID) {
  let now = new Date();
  let joined = await database.getTimeJoined(oldMember.member.user);

  // getTime returns time in seconds
  let diff = (now.getTime() - joined.getTime()) / 1000;

  console.log(Math.round(diff / 60));

  //Filter out users less than 5 minutes = 5 * 60
  if (diff > 5 * 60) {
    let amount;
    if (
      channelID == "687839393444397111" ||
      channelID == "816565807693824031"
    ) {
      // Wavy Pay 2 Win
      if (oldMember.member.premiumSince != null)
        amount = Math.round(diff / (3 * 60));
      else amount = Math.round(diff / (5 * 60));
      //console.log("in arcade + wavy")
    }
    // else if (channelID == '816565807693824031') {
    //     amount = Math.round(diff / (5 * 60));
    //     //console.log("in wavy")
    // }
    else {
      amount = 0;
    }

    let succ = await database.addCurrency(oldMember.member.user, amount);

    if (succ && await database.checkNotif(oldMember.member.user.id)) {
      sendReceipt(oldMember, diff, amount);
    }
  }
}

async function sendReceipt(member, time, amount) {
  let wallet = await database.getCurrency(member.member.user.id);
  let cum = await database.getCum(member.member.user.id);

  var today = new Date();

  var date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();

  var timeFormat = "";
  if (time > 86400) {
    timeFormat = "a very long time <:PepeMonkaOMEGA:814749729538834452>";
  } else {
    timeFormat = new Date(null);
    timeFormat.setSeconds(time);

    timeFormat = timeFormat.toISOString().substring(11, 19);
  }

  let embed = new EmbedBuilder()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Wallet")
    .setThumbnail("https://i.ibb.co/5kL7hBD/Wavy-Logo.png")
    .setDescription(
      "**" +
        date +
        "**" +
        "\nSession Length: **" +
        timeFormat +
        "**" +
        "\n\nCoins made this session: " +
        amount +
        " <:HentaiCoin:814968693981184030>" +
        "\n**Total monthly balance**: " +
        (wallet + amount) +
        " <:HentaiCoin:814968693981184030>" +
        "\n**Cumulative balance**: " +
        (cum + wallet + amount) +
        "<:HentaiCoin:814968693981184030>" +
        "\n\nTo disable automatic updates after every session:" +
        "\n\xa0\xa0\xa0\xa0\xa0Type **$disable** in any【 𝓦 𝓪 𝓿 𝔂 】text channel" +
        "\n\nTo enable this feature again:" +
        "\n\xa0\xa0\xa0\xa0\xa0Type **$enable** in any【 𝓦 𝓪 𝓿 𝔂 】text channel" +
        "\n\n*Commands typed in this DM will not work*"
    );

  message = await member.member.send({ embeds: [embed] }).catch(err => {
      console.log(member.member.user.id)
      console.log(err)
      return null
  });
}

async function disableReceipts(msg) {
  var today = new Date();
  var date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();

  let embed = new EmbedBuilder()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Notice")
    .setThumbnail(
      "https://cdn.discordapp.com/app-icons/812904867462643713/c3713856eae103c4cad96111e26bce21.png?size=512"
    )
    .setDescription(
      "**" +
        date +
        "**" +
        "\nYou have disabled coin receipts.\nYou will **not** receive automatic receipts after a voice session" +
        "\n\nTo disable automatic receipts:" +
        "\n\xa0\xa0\xa0\xa0\xa0Type **$disable** in any【 𝓦 𝓪 𝓿 𝔂 】text channel" +
        "\n\nTo enable this feature again:" +
        "\n\xa0\xa0\xa0\xa0\xa0Type **$enable** in any【 𝓦 𝓪 𝓿 𝔂 】text channel" +
        "\n\n*Commands typed in this DM will not work*"
    );

  msg.author.send({ embeds: [embed] });

  database.disableReceipt(msg.author.id);

  msg.delete();
}

async function enableReceipts(msg) {
  var today = new Date();
  var date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();

  let embed = new EmbedBuilder()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Notice")
    .setThumbnail(
      "https://cdn.discordapp.com/app-icons/812904867462643713/c3713856eae103c4cad96111e26bce21.png?size=512"
    )
    .setDescription(
      "**" +
        date +
        "**" +
        "\nYou have enabled coin receipts.\nYou will now receive automatic receipts after a voice session" +
        "\n\nTo disable automatic receipts:" +
        "\n\xa0\xa0\xa0\xa0\xa0Type **$disable** in any【 𝓦 𝓪 𝓿 𝔂 】text channel" +
        "\n\nTo enable this feature again:" +
        "\n\xa0\xa0\xa0\xa0\xa0Type **$enable** in any【 𝓦 𝓪 𝓿 𝔂 】text channel" +
        "\n\n*Commands typed in this DM will not work*"
    );

  msg.author.send({ embeds: [embed] });

  database.enableReceipt(msg.author.id);

  msg.delete();
}

async function sendMessage(ID, message) {
  let rec = client.users.cache.get(ID);
  rec.send(message);
}

async function purgeAlts() {
  // jinmoto2 : 422931223552458764
  // 102: 799728810261086259
  // kaon02: 801683957556838421
  // lil majima : 1029129814646476890
  // Haldoos : 775501860123574322
  // Phone Sloth: 1054197359480942664
  // nachomic: 906011068378275852

  // Yuji: 772797231971041290

  //database.updateAlts(alts)

  database.purgeAlts()
}
