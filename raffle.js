const database = require('./firebaseSDK');
const Discord = require('discord.js');

let rffID = '962309632527835166';

async function updateRaffle(channel) {
    console.log("updating raffle")

    let r = await database.getRaffle();

    let embed = await getEmbed(r);

    let exists = true;
    try {
        await channel.messages.fetch(rffID)
    } catch (error) {
        console.error(error)
        exists = false;
    } finally {
        if (!exists) {

            //Create New Raffle Message
            let msg = await channel.send(embed)
            msg.react('<:HentaiCoin:814968693981184030>')
            rffID = msg.id
            return msg;

        } else {

            //Fetch Existing Raffle Message
            let msg = await channel.messages.fetch(rffID)        
            msg.edit(embed);
            return msg;
        }
    }
}

async function startRaffleTimer(winnerChannel, msg, sendRaffleAlert) {
    let r = await database.getRaffle();
    let timeLeft = getRawTime(r);

    console.log(new Date().toLocaleString())

    embed = msg.embeds[0]

    interval = setInterval(() => {
        timeLeft -= 10000;
        embed.fields.forEach(field => {

            if (field.name == "Countdown Until Raffle Draw")
                field.value = "```fix\n" + timeFormat(timeLeft) + "\n```"
        })

        if (timeLeft <= 600000 && timeLeft > 591000)
            alertCandidates(sendRaffleAlert)

        if (timeLeft <= 0) {
            //pickWinner(winnerChannel)
            embed.fields.forEach(field => {
                if (field.name == "Countdown Until Raffle Draw")
                    field.value = "```fix\nclosed\n```"
            })

            msg.edit(embed)
            return
        }

        msg.edit(embed)
    }, 10000)
    console.log("out of loop")
}

async function getEmbed(r) {

    time = await calculateTimer(r);

    let embed = await new Discord.MessageEmbed()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Raffle")
    .setThumbnail('https://i.ibb.co/5kL7hBD/Wavy-Logo.png')
    .setDescription("@everyone A new raffle for **" + r.name + "** is now open! You are free to spend your Hentai Coins <:HentaiCoin:814968693981184030> to buy tickets." 
                        + "\n```"+ r.description + "```")
    .addFields(
        { name: "Cost per Ticket:  " + r.cost_per_ticket, value: '\u200B' },
        { name: "Max Tickets per Person:  " + r.max_tickets, value: '\u200B' },
        { name: "To purchase tickets, click the <:HentaiCoin:814968693981184030> below", value: '\u200B' },
        { name: "Countdown Until Raffle Draw", value: "```fix\n" + time + "\n```" }
    )
    .setFooter("Sponsored by PornHub", 'https://steamuserimages-a.akamaihd.net/ugc/966474717666996844/124820F71D8D65A2986BE2DAEA1ADAFBC0308A23/')

    return embed;
}

// Await reactions on raffle messages, recursive
async function awaitRaffleReaction(message, channel, filter, logs) {
    console.log("awaiting reaction")
    let user;

    await message.awaitReactions(filter, { max: 1 })
    .then(async collected => {
        user = collected.first().users.cache.last()
        await message.reactions.cache.find(r => r.emoji.id == '814968693981184030').users.remove(user)
    }).catch(err => console.log(err))

    await ticketPurchase(user, channel, logs).catch(err => console.log(err))

    awaitRaffleReaction(message, channel, filter, logs)
}

async function ticketPurchase(user, channel, logs) {
    let raffle = await database.getRaffle();
    let tickets = raffle.tickets_per_user
    let available = raffle.max_tickets

    let todelete = []

    // If user already bought max tickets
    if (user.id in tickets && tickets[user.id] >= raffle.max_tickets) {
        let max_tix = await channel.send("You already purchased the max number of tickets")
        todelete.push(max_tix)

        const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
        await wait(3000);

        channel.bulkDelete(todelete)
        
        return

    // If user already bought tickets, but isn't maxed
    } else if (user.id in tickets && tickets[user.id] < raffle.max_tickets) {
        available -= tickets[user.id]
    }

    let amount = await channel.send("<@" + user.id + "> You can purchase **" + available + "** tickets. How many tickets would you like to purchase? Your balance is: **"
                + await database.getCurrency(user.id)
                + "** <:HentaiCoin:814968693981184030>.\n You can type 'all' to purchase as many tickets as you can afford.")
    todelete.push(amount)
    
    let filter = (m) => m.author.id == user.id;
    let collected = await channel.awaitMessages(filter, { max: 1, time: 30000, errors: ['time'] }).catch(async err => {
        console.error(err)

        const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
        await wait(3000);

        channel.bulkDelete(todelete)
        return null
    })
    if (collected == null) 
        return

    todelete.push(await channel.messages.fetch(collected.first().id))

    //Handles valid input and currency charge
    let response = await calculateCurrency(raffle, channel, collected, user, logs);
    todelete.push(response)

    const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
    await wait(3000);

    channel.bulkDelete(todelete)
}

async function calculateCurrency(raffle, channel, message, user, logs) {

    let wallet = await database.getCurrency(user.id);

    // If input is not a valid number
    if(isNaN(message.first().content) && message.first().content != 'all') {
        return await channel.send("Please enter a valid number <:PogO:804089420020973568>")
        .then(message => {return message})

    // If input is 0
    } else if (parseInt(message.first().content) == 0) {
        return await channel.send("If you're gonna buy 0 tickets, don't waste my time")
        .then(message => {return message})

    // If user doesn't have enough money to buy at least 1 ticket
    } else if (wallet < raffle.cost_per_ticket) {
        return await channel.send("You don't have enough <:HentaiCoin:814968693981184030>. Broke ass bitch")
        .then(message => {return message})

    } else if (wallet < 0) {
        if (user.id == '232394108524691457')
            return await channel.send("Nice try Yuji")
            .then(message => {return message})
        else
            return await channel.send("I don't think negative coins exist")
            .then(message => {return message})

    } else if (wallet % 1 != 0) {
        return await channel.send("wtf man")
        .then(message => {return message})
    }

    // If user enters 'all'
    let remaining;
    let purchased = await database.getTicketsPurchased(user.id);
    let max = Math.min(raffle.max_tickets - purchased, Math.trunc(wallet/raffle.cost_per_ticket));
    if (message.first().content == "all") {
        remaining = wallet - (max * raffle.cost_per_ticket);

        // Logs of the transaction
        logs.send("```" + new Date().toLocaleString() + 
                  "\nID: " + user.id + "     Name: " + user.username +
                  "\nAmount: " + max + "     Cost/T: " + raffle.cost_per_ticket +
                  "\nWallet B/A: " + wallet + " | " + remaining + "```")

        // Subtract from User's wallet
        //database.removeCurrency(user, max * raffle.cost_per_ticket)

        // Add to tickets_per_user array
        database.addTicketsPurchased(user.id, max)

        // Add to all_tickets
        database.addAllTickets(user.id, max)
        
        return await channel.send("You purchased a total of " + max + " tickets. Your remaining balance is: " + remaining + " <:HentaiCoin:814968693981184030>")
        .then(message => {return message})
    }
    
    // If user enters a valid number
    let amount = Math.trunc(parseInt(message.first().content));
    if (amount > max) {
        return await channel.send("Please check again how many <:HentaiCoin:814968693981184030> you can purchase")
        .then(message => {return message})
    } else {
        remaining = wallet - (amount * raffle.cost_per_ticket);

        logs.send("```\n" + new Date().toLocaleString() + 
                  "\nID: " + user.id + "     Name:" + user.username +
                  "\nAmount: " + amount + "     Cost/T: " + raffle.cost_per_ticket +
                  "\nWallet B/A: " + wallet + " | " + remaining + "\n```")

        // Subtract from User's wallet
        //database.removeCurrency(user, amount * raffle.cost_per_ticket)

        //Add to tickets_per_user array
        database.addTicketsPurchased(user.id, amount)

        //Add to all_tickets
        database.addAllTickets(user.id, amount)

        return await channel.send("You purchased a total of " + amount + " tickets. Your remaining balance is: " + remaining + " <:HentaiCoin:814968693981184030>")
        .then(message => {return message})
    }
}

// Raffle Winner Channel: 962365291109707797
async function pickWinner(channel) {
    let allTickets = await database.getAllTickets()
    let raffleName = await database.getRaffleName()

    let winner = allTickets[Math.floor(Math.random() * allTickets.length)];

    const wait = delay => new Promise(resolve => setTimeout(resolve, delay));

    let text = "@everyone The winner's draw for **" + raffleName + "** is starting\n🔀 Shuffling all **" + allTickets.length + "** tickets\n"
    let msg = await channel.send(text)
    await wait(5000);

    text += "🦠 Sending unicode mainframe into the ~~virus~~ program\n"
    msg.edit(text)
    await wait(5000);
    
    text += "💉 Creating new COVID-19 vaccine, optimized trajectory for Mars\n"
    msg.edit(text)
    await wait(5000);

    const random = Math.floor(Math.random() * (101 - 50)) + 50;
    text += "⚛️ Nuclear Fission Atomic Reconstruction Process: **" + random.toString() + "%** ✔️\n"
    msg.edit(text)
    await wait(5000);

    text += "🏆 Drawing the Winning Ticket!\n"
    msg.edit(text)
    await wait(5000);

    text += "The winner is"
    msg.edit(text)
    await wait(1000);
    
    text += "."
    msg.edit(text)
    await wait(1000);

    text += "."
    msg.edit(text)
    await wait(1000)

    text += "."
    msg.edit(text)
    await wait(5000)

    text += "\n\n**<@" + winner + ">** Congratulations! \n*The prize will be distributed shortly*"
    msg.edit(text)



}

function getRawTime(r) {
    // Get End Date + Time
    let countDownDate = r.CD.toDate().getTime()

    let now = new Date().getTime();
    let timeleft = countDownDate - now;
    return timeleft
}

function calculateTimer(r) {
    // Get End Date + Time
    var countDownDate = r.CD.toDate().getTime()

    var now = new Date().getTime();
    var timeleft = countDownDate - now;

    return timeFormat(timeleft)
}

function timeFormat(t) {
    let d = Math.floor(t / (1000 * 60 * 60 * 24));
    let h = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let m = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
    let s = Math.floor((t % (1000 * 60)) / 1000);

    return d.toString() + " days   " + ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2)
}

async function alertCandidates(sendRaffleAlert) {
    console.log("Sending alerts")
    let users = await database.getAllCandidates()
    let name = await database.getRaffleName()
console.log(users)
    let embed = await new Discord.MessageEmbed()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Raffles")
    .setThumbnail('https://cdn.discordapp.com/attachments/824106380222005288/824110141305651240/artworks-000505954353-sqeh0j-t500x500.jpg')
    .setDescription("The raffle for **" + name + "** is closing in 10 minutes" + 
                    "\n**We're about to pick a winner!**" +
                    "\n\nPlease go to the #raffle-winners channel to see if you won\n")

    for (let i = 0; i < users.length; i++) {
        let purchased = "**" + (await database.getTicketsPurchased(users[i])).toString() + "**"
        embed.addFields(
            { name: 'Tickets Purchased: ', value: purchased },
        )
        sendRaffleAlert(users[i], embed)
    }
}

module.exports = {
    awaitRaffleReaction : awaitRaffleReaction,
    updateRaffle : updateRaffle,
    startRaffleTimer: startRaffleTimer,
    pickWinner : pickWinner
}