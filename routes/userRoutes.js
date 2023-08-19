const router = require('express').Router();
const User = require('../models/User');

/////////////////////

// // creating user
// router.post('/', async (req, res, next) => {

//   const { name, email, password, picture } = req.body;
//   const createdUser = new User({ // Obratiti paznju kako ce se places -> [] popunjavati kada se kreira novo mesto za datog usera
//     name,
//     email,
//     password
//   });

//   try {
//     await createdUser.save(); // async save metod -> radi 'sve' -> (pronalazi mongoDB bazu podataka koja je precizirana u url/u, pronalazi pravu kolekciju (kolekcija je onakva kakva je imenovana u User.js samo sto je pocetno slovo malo i postoji s na kraju), vrsi insertovanje u bazu podataka i zatvara klijenta-konekciju.
//   } catch (err) {

//     return next(err);
//   }

//   res.status(201).json({ user: createdUser, email: createdUser.email, token: 'Radi' });

// })

// /////////////////


// creating user
router.post('/', async (req, res) => {
  try {
    const { name, email, password, picture } = req.body;
    console.log(req.body);
    const user = await User.create({ name, email, password, picture });
    res.status(201).json(user);
  } catch (e) {
    let msg;
    if (e.code == 11000) {
      msg = "User already exists"
    } else {
      msg = e.message;
    }
    console.log(e);
    res.status(400).json(msg)
  }
})

// login user

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    user.status = 'online';
    await user.save();
    res.status(200).json(user);
  } catch (e) {
    res.status(400).json(e.message)
  }
})


module.exports = router
