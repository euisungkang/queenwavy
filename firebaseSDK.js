const admin = require("firebase-admin");
const serviceAccount = require("./wavy-46a75-firebase-adminsdk-3pwsf-20426075e0.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

async function addCurrency(m, amount) {
    let { id } = m;
    let name = m.member.user.username

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
        console.log("Error: " + err);
    })
};

async function removeCurrency(m, amount) {
    let { id } = m;
    let name = m.member.user.username

    let user = db.collection('wallets').doc(id);
    let aggregate_amount;

    const doc = await user.get();
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
        console.log("Error: " + err);
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

module.exports = {
    addCurrency : addCurrency,
    removeCurrency : removeCurrency,
    getCurrency : getCurrency,
    getRaffle : getRaffle
}