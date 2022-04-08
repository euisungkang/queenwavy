const Discord = require('discord.js');
const database = require('./firebaseSDK');
const cron = require('node-cron')
const raffle = require('./raffle.js');
const { setTimeJoined } = require('./firebaseSDK');
const client = new Discord.Client();

//client.login('ls');
client.login(process.env.BOT_TOKEN)

client.on('ready', async () => {
    console.log('help');

    purgeAlts();

    //Command channel
    let channel = await client.channels.fetch('794722902003941417')

    let raffle_channel = await client.channels.fetch('824718105989218349')
    let raffle_logs = await client.channels.fetch('961870235542106162')

    //let status_msg = await raffle_channel.messages.fetch('824718440476311562')
    //status_msg.edit("__**Raffle Status: **__\n```diff\n- Offline\n```")

    initializeRaffle(raffle_channel, raffle_logs)

    //sendReceipt('237018129664966656')
});

cron.schedule('00 * * * *', async () => {
    purgeAlts();
})

let prefix = '$'

client.on('message', async message => {
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.trim().split(/ +/g);
    const cmd = args[0].slice(prefix.length).toLowerCase();
  
    if (cmd == 'wallet') {
        walletCommand(message)
    } else if (cmd == 'disable') {
        disableReceipts(message)
    } else if (cmd == 'enable') {
        enableReceipts(message)
    }
    // else if (cmd == 'give') {
    //     giveCommand(args, message)
    // }
});

client.on('voiceStateUpdate', async (oldMember, newMember) => {
    let { id } = oldMember;

    let oldUserChannel = oldMember.channel;
    let newUserChannel = newMember.channel;

    // If user enters a channel for the first time
    if (oldUserChannel === null && newUserChannel != null && !(await isBot(id))) {

        // Category ID of arcade: 687839393444397111
        // Category ID of Wavy: 816565807693824031
        if (await channelIsValid(newUserChannel)) {

            database.setTimeJoined(oldMember.member.user)

            //console.log('Joined Channel: ' + newMember.member.user.username)
        }

    // If user exits channels
    } else if (oldUserChannel != null && newUserChannel === null && !(await isBot(id))) {
        if (await channelIsValid(oldUserChannel)) {   
            calculateTimeSpent(oldMember, oldUserChannel.parentID)
        }

    // Moving between channels
    } else if (oldUserChannel != null && newUserChannel != null && !(await isBot(id))) {
        //console.log("moving")

        // Category ID of arcade: 687839393444397111

        // If moving from valid to non-valid channel
        if (await channelIsValid(oldUserChannel) && !(await channelIsValid(newUserChannel))) {
            calculateTimeSpent(oldMember, oldUserChannel.parentID);
            database.setTimeJoined(oldMember.member.user)
        // If moving from non-valid to valid channel
        } else if (!(await channelIsValid(oldUserChannel)) && await channelIsValid(newUserChannel)) {

            database.setTimeJoined(oldMember.member.user)

        } else if ((await channelIsValid(oldUserChannel) && await channelIsValid(newUserChannel)) &&
                  ((oldUserChannel.parentID == '687839393444397111' && newUserChannel.parentID == '816565807693824031') ||
                   (oldUserChannel.parentID == '816565807693824031' && newUserChannel.parentID == '687839393444397111'))) {
            await calculateTimeSpent(oldMember, oldUserChannel.parentID);
            database.setTimeJoined(oldMember.member.user)
            console.log("Switched to " + oldUserChannel.parentID + " : " + newMember.member.user.username)
        }
    }
});

async function errorMessage(message, m) {
    let err = await message.reply(m)
    const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
    await wait(3000);
    err.delete()
    message.delete()
}

// Forbidden
async function giveCommand(args, message) {
    console.log(args)
    if (!args[2] || args[3]) {
        errorMessage(message, "Incorrect number of arguments.")
        return;
    }

    let ID = await (args[1]).match(/(\d+)/)
    if (ID == null) {
        errorMessage(message, "Invalid user to send <:HentaiCoin:814968693981184030>")
        return;
    }

    let user = await client.users.fetch(ID[0]).catch(err => {return null})
    let source = await client.users.fetch(message.author.id).catch(err => {return null})
    let amount = parseInt(args[2])

    if (user == null || source == null) {
        errorMessage(message, "Invalid user to send <:HentaiCoin:814968693981184030>")
        return;
    } else if (isNaN(amount) || amount < 1) {
        errorMessage(message, "Please enter a valid number :unamused:")
        return;
    } else if (user.id == source.id) {
        errorMessage(message, "Can't sent money to yourself <:PepeWHAT:813130771799081030> <:PepeWHAT:813130771799081030> <:PepeWHAT:813130771799081030>")
        return;
    }

    let wallet = await database.getCurrency(ID[0])
    let wallet2 = await database.getCurrency(message.author.id)

    if (amount > wallet2) {
        errorMessage(message, "You don't have enough <:HentaiCoin:814968693981184030> to send that much <:PepeWHAT:813130771799081030>")
        return
    }

    database.removeCurrency(source, amount)
    database.addCurrency(user, amount)

    let embed = await new Discord.MessageEmbed()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Transaction Record")
    .setThumbnail('https://i.ibb.co/5kL7hBD/Wavy-Logo.png')
    .setDescription(source.username + " has sent you " + amount + " <:HentaiCoin:814968693981184030>\nYour balance is now " + (wallet + amount) + " <:HentaiCoin:814968693981184030>")

    let embed2 = await new Discord.MessageEmbed()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Transaction Record")
    .setThumbnail('https://i.ibb.co/5kL7hBD/Wavy-Logo.png')
    .setDescription("You sent " + user.username + " " + amount + " <:HentaiCoin:814968693981184030>\nYour balance is now " + (wallet2 - amount) + " <:HentaiCoin:814968693981184030>")

    user.send(embed)
    source.send(embed2)

    let log = await client.channels.fetch('826499502403747921')
    log.send("Source: " + source.username + "   to "  +user.username + "     amount: " + amount)

    message.delete()    
}

async function walletCommand(message) {
    let wallet = await database.getCurrency(message.author.id)

    var today = new Date();

    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    //var time = today.getHours() + ":" + today.getMinutes();

    let embed = await new Discord.MessageEmbed()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Wallet")
    .setThumbnail('https://i.ibb.co/5kL7hBD/Wavy-Logo.png')
    .setDescription("Date: " + date + ". You currently have " + wallet + " <:HentaiCoin:814968693981184030>")

    message.author.send(embed)

    message.delete();
} 

async function isBot(id) {
    let user = await client.users.fetch(id)
    return user.bot
}

async function channelIsValid(channel) {
    // Arcade: 687839393444397111
    // Wavy: 816565807693824031
    // Study: 809345799526809600
    // AFK: 814930846326456420

    let valid = await ((channel.parentID == '687839393444397111' || channel.parentID == '816565807693824031') && channel.id != '809345799526809600' && channel.id != '814930846326456420');

    return valid
}

async function calculateTimeSpent(oldMember, channelID) {
     
    let now = new Date();
    let joined = await database.getTimeJoined(oldMember.member.user)

    // getTime returns time in seconds
    let diff = (now.getTime() - joined.getTime()) / 1000;

    console.log(diff);

    // Filter out users less than 5 minutes = 5 * 60
    if (diff > (5 * 60)) {
        let amount;
        if (channelID == '687839393444397111') {
            amount = Math.floor(diff / (5 * 60));
            //console.log("in arcade")
        }
        else if (channelID == '816565807693824031') {
            amount = Math.floor(diff / (5 * 60));
            //console.log("in wavy")
        }
        else {
            amount = 0;
        }

        if (await database.checkNotif(oldMember.member.user.id)) {
            sendReceipt(oldMember, diff, amount)
        }

        await database.addCurrency(oldMember.member.user, amount);
    }
}

async function sendReceipt(member, time, amount) {
    let wallet = await database.getCurrency(member.member.user.id)

    var today = new Date();

    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

    var timeFormat = ""
    if (time > 86400) {
        timeFormat = "a very long time <:PepeMonkaOMEGA:814749729538834452>"
    } else {
        timeFormat = new Date(null)
        timeFormat.setSeconds(time)

        timeFormat = timeFormat.toISOString().substring(11, 19)
    }

    let embed = await new Discord.MessageEmbed()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Wallet")
    .setThumbnail('https://i.ibb.co/5kL7hBD/Wavy-Logo.png')
    .setDescription("**" + date + "**" + 
                    "\nSession Length: **" + timeFormat + "**" + 
                    "\n\nCoins made this session: " + amount + " <:HentaiCoin:814968693981184030>" +
                    "\n**Total balance**: " + (wallet + amount) + " <:HentaiCoin:814968693981184030>" +
                    "\n\nTo disable automatic updates after every session:" +
                    "\n\xa0\xa0\xa0\xa0\xa0type **$disable** in any【 𝓦 𝓪 𝓿 𝔂 】text channel" +
                    "\n\nTo enable this feature again:" +
                    "\n\xa0\xa0\xa0\xa0\xa0type **$enable** in any【 𝓦 𝓪 𝓿 𝔂 】text channel" +
                    "\n\n*Commands typed in this DM will not work*")

    message = await member.member.send(embed)
}

async function disableReceipts(msg) {
    database.disableReceipt(msg.author.id)

    msg.delete()
}

async function enableReceipts(msg) {
    database.enableReceipt(msg.author.id)

    msg.delete()
}

async function initializeRaffle(channel, logs) {
    let msg = await raffle.updateRaffle(channel);

    msg.react('<:HentaiCoin:814968693981184030>');
    const filter = (reaction, user) => reaction.emoji.id == '814968693981184030' && user.id != msg.author.id
    raffle.awaitRaffleReaction(msg, channel, filter, logs);

    raffle.startRaffleTimer(msg);
}

let alts = ['422931223552458764', '799728810261086259', '801683957556838421', '808484429038092298', '775501860123574322', '161024271827599360', '638887290751549443', '485471519162499075']

async function purgeAlts() {
    // jinmoto2 : 422931223552458764
    // 102: 799728810261086259
    // kaon02: 801683957556838421
    // Phone Sloth: 808484429038092298
    // Haldoos : 775501860123574322
    // nachomic: 161024271827599360
    // lil majima : 638887290751549443
    // Sedol: 485471519162499075
    for (let i = 0; i < alts.length; i++) {
        database.purgeWallet(alts[i])
    }
}