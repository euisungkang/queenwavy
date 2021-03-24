const database = require('./firebaseSDK');

// Await reactions on raffle messages, recursive
async function awaitRaffleReaction(message, channel, filter) {
    let user;

    await message.awaitReactions(filter, { max: 1 })
    .then(async collected => {
        user = collected.first().users.cache.last()
        await message.reactions.cache.find(r => r.emoji.id == '814968693981184030').users.remove(user)
    })
    .catch(err => console.log(err))

    await ticketPurchase(user, channel).catch(err => console.log(err))

    awaitRaffleReaction(message, channel, filter)
}

async function ticketPurchase(user, channel) {
    await channel.send("<@" + user.id + "> How many tickets would you like to purchase? Your balance is: **"
                + await database.getCurrency(user.id)
                + "** <:HentaiCoin:814968693981184030>.\n You can type 'all' to purchase as many tickets as you can afford.")
    .then(async (message) => {
        let filter = (m) => m.author.id == user.id;

        // How many tickets does user want to buy?
        await channel.awaitMessages(filter, { max: 1, time: 30000, errors: ['time'] })
        .then(async collected => {
            console.log(user.id + "     " + collected.first().content + "      " + await database.getCurrency(user.id))

            let response = await calculateCurrency(channel, collected, user);

            const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
            await wait(5000);

            await channel.messages.fetch(collected.first().id)
            .then(m => m.delete())
            .catch(err => console.log(err))

            await collected.delete()

            await response.delete()
        })
        .catch(err => console.log(err))
        await message.delete()
    })
    .catch(err => console.log(err))
}

async function calculateCurrency(channel, message, user) {
    let raffle = await database.getRaffle();
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
    }

    // If user enters 'all'
    let remaining;
    let max = Math.trunc(wallet/raffle.cost_per_ticket);
    if (message.first().content == "all") {
        remaining = wallet - (max * raffle.cost_per_ticket);

        database.removeCurrency(user.id, user.username, max * raffle.cost_per_ticket)

        return await channel.send("You purchased a total of " + max + " tickets. Your remaining balance is: " + remaining + " <:HentaiCoin:814968693981184030>")
        .then(message => {return message})
    }
    
    // If user enters a valid number
    let amount = Math.trunc(parseInt(message.first().content));
    if (amount > max) {
        return await channel.send("You don't have enough <:HentaiCoin:814968693981184030>. Broke ass bitch")
        .then(message => {return message})
    } else {
        remaining = wallet - (amount * raffle.cost_per_ticket);

        database.removeCurrency(user.id, user.username, amount * raffle.cost_per_ticket)

        return await channel.send("You purchased a total of " + amount + " tickets. Your remaining balance is: " + remaining + " <:HentaiCoin:814968693981184030>")
        .then(message => {return message})
    }
}

module.exports = {
    awaitRaffleReaction : awaitRaffleReaction,
    ticketPurchase : ticketPurchase,
    calculateCurrency : calculateCurrency
}