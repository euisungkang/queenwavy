const admin = require("firebase-admin");
const serviceAccount = require("./wavy-46a75-firebase-adminsdk-3pwsf-20426075e0.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

async function addCurrency(m, amount) {
    let id = m.id
    let name = m.username

    console.log("ID: " + id + "    name:" + name + "    amount: " + amount);

    let user = db.collection('wallets').doc(id);
    let aggregate_amount = amount;

    const doc = await user.get();
    if (doc.exists) {
        aggregate_amount += doc.data().currency;
        console.log(doc.data());
    }

    await user.set({
        userID: id,
        name: name,
        currency: aggregate_amount
    }).then(() => {
        console.log("Document written successfully");
    }).catch(err => {
        console.log(err);
    })
};

async function setTimeJoined(m) {
    let time = new Date()

    console.log("User: " + m.username + " of ID: " + m.id + " joined VC at " + time)

    let user = db.collection('wallets').doc(m.id);

    const doc = await user.get();
    if (!doc.exists) {
        await user.set({
            userID: m.id,
            name: m.username,
            currency: 0,
            time: time
        }).then(() => {
            console.log("Time Added Successfully");
        }).catch(err => {
            console.log(err);
        })
    } else {
        await user.update({
            time: time
        }).then(() => {
            console.log("Time Added Successfully");
        }).catch(err => {
            console.log(err);
        })
    }
}

async function getTimeJoined(m) {
    let time = new Date()

    console.log("User: " + m.username + " of ID: " + m.id + " left a channel at " + time)

    let user = db.collection('wallets').doc(m.id);
    const doc = await user.get();
    if (doc.exists && doc.data().time != null) {
        time = doc.data().time.toDate()
    }

    await user.update({
        time: null
    }).then(() => {
        console.log("Time Removed Successfully");
    }).catch(err => {
        console.log(err);
    })

    return time
}

async function removeCurrency(m, amount) {
    let id = m.id
    let name = m.username

    let user = db.collection('wallets').doc(id);
    let aggregate_amount;

    const doc = await user.get();
    //console.log(doc)
    if (doc.exists) {
        aggregate_amount = doc.data().currency - amount;
        console.log(doc.data());
    }

    await user.set({
        userID: id,
        name: name,
        currency: aggregate_amount
    }).then(() => {
        console.log("Document written successfully");
    }).catch(err => {
        console.log(err);
    })
}

async function purgeWallet(id) {
    let name = "ALT ACCOUNT"
    
    let user = db.collection('wallets').doc(id)
    
    await user.set({
        userID: id,
        name: name,
        currency: 0
    }).catch(err => {
        console.log(err)
    })
}


async function getCurrency(id) {
    let user = db.collection('wallets').doc(id);

    const doc = await user.get();
    if (doc.exists) {
        return doc.data().currency;
    }

    return 0;
}

async function getRaffle() {
    let raffleID = await (await db.collection('raffles').doc('metadata').get()).data().raffle_id;

    //console.log(raffleID)

    let raffle = await db.collection('raffles').doc(raffleID.toString());
    let doc = await raffle.get();

    return doc.data();
}


async function getTopWallets() {
    const wallets = await db.collection('wallets').get();
    let walletmap = new Map();

    wallets.docs.map(doc => {
        walletmap.set((doc.data()).userID, (doc.data()).currency);
    })

    const sorted = await new Map([...walletmap.entries()].sort((a, b) => b[1] - a[1]));

    let index = 0;
    for (let k of sorted.keys()) {
        if (index > 4) {
          sorted.delete(k);
        }
        index++;
    }

    return sorted;
}

module.exports = {
    addCurrency : addCurrency,
    removeCurrency : removeCurrency,
    purgeWallet : purgeWallet,
    getCurrency : getCurrency,
    getRaffle : getRaffle,
    getTopWallets : getTopWallets,
    setTimeJoined : setTimeJoined,
    getTimeJoined : getTimeJoined
}