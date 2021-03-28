const Discord = require('discord.js');
const database = require('./firebaseSDK');
const cron = require('node-cron')
const raffle = require('./raffle.js')
const client = new Discord.Client();

//client.login('');
client.login(process.env.BOT_TOKEN)

client.on('ready', async () => {
    console.log('help');

    purgeAlts();

    //Command channel
    let channel = await client.channels.fetch('794722902003941417')

    let raffle_channel = await client.channels.fetch('824718105989218349')

    // let status_msg = await raffle_channel.messages.fetch('824718440476311562')
    // status_msg.edit("__**Raffle Status: **__\n```diff\n- Offline\n```")

    initializeRaffle(raffle_channel)
});

cron.schedule('00 * * * *', async () => {
    purgeAlts();
})

let voiceStates = {};
let prefix = '$'

client.on('message', async message => {
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.trim().split(/ +/g);
    const cmd = args[0].slice(prefix.length).toLowerCase();
  
    if (cmd == 'wallet') {
        walletCommand(message)
    } else if (cmd == 'give') {
        giveCommand(args, message)
    }
});

client.on('voiceStateUpdate', async (oldMember, newMember) => {
    let { id } = oldMember;

    let oldUserChannel = oldMember.channel;
    let newUserChannel = newMember.channel;

    // If user enters a channel for the first time
    if (oldUserChannel === null && newUserChannel != null && !(await isBot(id))) {

        // Category ID of arcade: 687839393444397111
        if (await channelIsValid(newUserChannel)) {
            voiceStates[id] = new Date();
            console.log('Joined Channel: ' + newMember.member.user.username)
        }

    // If user exits channels
    } else if (oldUserChannel != null && newUserChannel === null && !(await isBot(id))) {
        if (await channelIsValid(oldUserChannel)) {   
            calculateTimeSpent(oldMember, id)
        }

    // Moving between channels
    } else if (oldUserChannel != null && newUserChannel != null && !(await isBot(id))) {
        //console.log("moving")

        // Category ID of arcade: 687839393444397111

        // If moving from valid to non-valid channel
        if (await channelIsValid(oldUserChannel) && !(await channelIsValid(newUserChannel))) {
            calculateTimeSpent(oldMember, id);
        
        // If moving from non-valid to valid channel
        } else if (!(await channelIsValid(oldUserChannel)) && await channelIsValid(newUserChannel)) {
            voiceStates[id] = new Date();
            console.log('Joined Channel: ' + newMember.member.user.username)
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
    // Study: 809345799526809600
    // AFK: 814930846326456420

    let valid = await (channel.parentID == '687839393444397111' && channel.id != '809345799526809600' && channel.id != '814930846326456420');

    return valid
}

async function calculateTimeSpent(oldMember, id) {
     
    let now = new Date();
    let joined = voiceStates[id] || new Date();

    // getTime returns time in seconds
    let diff = (now.getTime() - joined.getTime()) / 1000;

    //console.log(diff);

    // Filter out users less than 5 minutes = 5 * 60
    if (diff > 5 * 60) {

        let amount = Math.round(diff / (5 * 60));
        await database.addCurrency(oldMember.member.user, amount);
    }
    console.log('Left Channel: ' + oldMember.member.user.username)

}

async function initializeRaffle(channel) {
    let msg = await raffle.updateRaffle(channel);

    msg.react('<:HentaiCoin:814968693981184030>');
    const filter = (reaction, user) => reaction.emoji.id == '814968693981184030' && user.id != msg.author.id
    raffle.awaitRaffleReaction(msg, channel, filter);
}

let alts = ['422931223552458764', '799728810261086259', '801683957556838421', '808484429038092298', '775501860123574322', '161024271827599360', '638887290751549443']

async function purgeAlts() {
    // jinmoto2 : 422931223552458764
    // 102: 799728810261086259
    // kaon02: 801683957556838421
    // Phone Sloth: 808484429038092298
    // Haldoos : 775501860123574322
    // nachomic: 161024271827599360
    // lil majima : 638887290751549443
    for (let i = 0; i < alts.length; i++) {
        database.purgeWallet(alts[i])
    }
}