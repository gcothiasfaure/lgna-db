// Define the node dependencies
const discord = require('discord.js');
const fetch = require('node-fetch');
const ytdl = require("ytdl-core");
const puppeteer = require('puppeteer');
const fs = require('fs');

// Personal identifiers
const giphyAPIKey = "";
const clientLogin = process.env.BOT_TOKEN // Will be replace in Heroku

// Import the cookies file
const cookies = require('./cookies.json');

// Initialize Discord client
const client = new discord.Client();

// Define prefix to use to call a bot command (it can be anything)
const prefix = "$";

// Initialize song queue for music playing
const queue = new Map();

//// Bot initialization
// Throw when Discord client ready
client.once('ready',onClientReady);

///// Command handling
// Throw on every new message in the channel
client.on('message',function(message) { onClientMessage(message); });

//------------------------------------------ Function definition ------------------------------------------

//-------------------- Bot initialization --------------------

/**
 * @brief Initialize the bot in the text channel
 */
function onClientReady() {

    // Print success log
    console.log("\nSUCCESS : Bot connecté au serveur avec succès.");
}

//-------------------- Command handling --------------------

/**
 * @brief Detect and execute the command requested
 * @param message : message object which trow this command
 */
function onClientMessage(message) {
    // Message not taken into account if doesn't start with prefix or send by the bot 
    if (!message.content.startsWith(prefix) || message.author.bot) return

    // Retreive the command (in lower case) without prefix
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    //------ dev-test ------
    // Test bot connection in the text channel
    if (command === 'dev-test') {
        // Send bot connection confirmation
        message.channel.send(":white_check_mark:  **Le bot est en ligne.**");
    }

    //------ dev-contrib ------
    // Display how to contrib to the bot
    else if (command === 'dev-contrib') {
        // Send two messages in a row
        message.channel.send(':desktop:  **Pour contribuer au développement ce bot ou l\'ajouter à un autre serveur, demandez une autorisation au propriétaire de ce bot :**');
        message.channel.send(':arrow_forward:  **https://github.com/GaspardCothiasFaure**');
    }

    //------ doc ------
    // Display bot documention (all possible commands)
    else if (command === 'doc') {
        // Creation of an embed message
        const embed = new discord.MessageEmbed()

        // Setting style of the embed message
        .setColor('#1858AC')
        .setTitle(':book: Documentation')

        // Add all the commands and their description
        .addFields(
            {name: "$doc",value:"Afficher la documentation utilisateur ci-présente"},
            {name: "$dev-doc",value:"Afficher la documentation développeur"},
            {name: "$toffice",value:"Afficher un GIF random de The Office"},
            {name: "$dua",value:"Jouer les meilleurs sons de queen Dua Lipa"},
            {name: "$stopdua",value:"Stoper la lecture des meilleurs sons de queen Dua Lipa"},
            {name: "$playgg",value:"Proposer une partie de GeoGuessr"},
            {name: "$ggcs",value:"Création des liens de 10 parties de Geoguessr (mode country streak 1 minute no mooving)"}      
        );

        // Send embed message
        message.channel.send(embed);
    }

    //------ dev-doc ------
    // Display bot dev documention (all possible commands)
    else if (command === 'dev-doc') {
        // Creation of an embed message
        const embedDev = new discord.MessageEmbed()

        // Setting style of the embed message
        .setColor('#1858AC')
        .setTitle(':book: Documentation développeur')

        // Add all the commands and their description
        .addFields(
            {name: "$dev-doc",value:"Afficher la documentation développeur ci présente"},
            {name: "$dev-test",value:"Tester l'état en ligne du bot"},
            {name: "$dev-contrib",value:"Contribuer au développement de ce bot, ou ajouter ce bot sur un autre serveur"}
        );

        // Send embed message
        message.channel.send(embedDev);
    }

    //------ dua ------
    // Play chosen songs of Dua Lipa in a random order in the vocal room 
    else if (command === 'dua') {
        // The bot play chosen songs of Dua Lipa in a random order in the vocal room
        initPlayMusic(message);
    }

    //------ stopdua ------
    // Stop playing Dua Lipa songs in the vocal room 
    else if (command === 'stopdua') {
        // The bot stops playing Dua Lipa songs in the vocal room
        stopMusic(message);
    }

    //------ playgg ------
    // Encourage to play GeoGuessr
    else if (command === 'playgg') {
        // Send two messages in a row
        message.channel.send(':earth_africa:  **Let\'s play GeoGuessr :**');
        message.channel.send(':arrow_forward:  **https://www.geoguessr.com/**');
    }

    //------ ggcs ------
    // Send 10 links of GeoGuessr games (country streak mode 1 minute no mooving)
    else if (command === 'ggcs') {
        message.channel.send("**Création des liens ...**");

        // Send the GeoGuessr links in the text channel
        sendGGLinks(message);
    }

    //------ toffice ------
    // Send a random The Office GIF in Giphy
    else if (command === 'toffice') {

        // Retreive a random The Office GIF from Giphy API
        fetch('https://api.giphy.com/v1/gifs/random?api_key='+giphyAPIKey+'&tag=the%20office')
        .then(res => res.json())
        .then(json => {
            // Create and send an embed message withe the GIF
            const embed = new discord.MessageEmbed().setImage(json.data.images.original.url);
            message.channel.send(embed);        
        })
        // If there is an error with the fetch (due to GIPHY API) => send default GIF
        .catch(function(error) {
            const embed = new discord.MessageEmbed().setImage("https://i.pinimg.com/originals/ea/82/86/ea8286a1e6a200aef18601eacc5c41a3.gif");
            message.channel.send(embed);
        });
    }

    //------ ? ------
    // Default behavour if the command is not defined
    else{   message.channel.send(":poop:  **Commande non trouvée.**");   }
}

//-------------------- Init play music --------------------

/**
* @brief : The bot play chosen songs of Dua Lipa in a random order in the vocal room 
* @param message : message object which trow this command
*/
async function initPlayMusic(message) {
    // Build array of songs (urls)
    const songs = ["https://youtu.be/WHuBW3qKm9g", "https://youtu.be/wMBNpVQ0k_k", "https://youtu.be/Bm8rz-llMhE", "https://youtu.be/2LAjqHW6Wv8"];

    // Verify if command sender is in a voice channel
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)  return message.channel.send(":warning:  **Vous devez être dans un salon vocal.**");

    // Verify bot has the right perimissions to play music
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(":warning:  **Je n'ai pas la permission de joindre et jouer un emusique dans un salon vocal.**");
    }

    // Initialize queue Map
    const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        volume: 5,
        playing: true
    };
    queue.set(message.guild.id, queueContruct);

    // Try to join the voice channel and play the music
    try {
        // Initialize connection to the voice channel
        var connection = await voiceChannel.join();
        queueContruct.connection = connection;

        // Send message and request to play a song
        message.channel.send(':crown:  **Listen the queen.**');
        /**
        * @brief : The bot play chosen songs of Dua Lipa in a random order in the vocal room 
        * @param message : message object which trow this command
        * @param songs : array of the url song
        */
        playMusic(message,songs);
    }
    catch (error) { 
        // Print error log
        console.log("\nERROR : Impossible to play music");
        console.log(error);
    }
}

//-------------------- Play music --------------------

/**
* @brief : The bot play chosen songs of Dua Lipa in a random order in the vocal room 
* @param message : message object which trow this command
* @param songs : array of the url song
*/
function playMusic(message,songs) {

    // Get a random song among the chosen urls
    const song = randSong(songs);

    // If all the song has been already played => song is null and the bot leave the voice channel
    if (!song) {
        message.member.voice.channel.leave();   
        return;
    }

    // Retreive serverQueue object
    const serverQueue = queue.get(message.guild.id);

    // Request to dispatcher to play the music and 
    const dispatcher = serverQueue.connection
    // Send request to play the song with play function of discord dispatcher thanks to ydl function
    .play(ytdl(song))
    .on("error", error => {
        // Print error log
        console.log("\nERROR : Impossible to play music");
        console.log(error);
    })
    // When the song is finished, pay another song left
    .on("finish", () => {   playMusic(message,songs)   });

    // Set music volume
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

//-------------------- Stop music --------------------

/**
* @brief : The bot stop play songs of Dua Lipa and leave vocal room
* @param message : message object which trow this command
*/
function stopMusic(message) {

    // Send message annoucing the stop of the music
    message.channel.send(':octagonal_sign:  **Stopping the queen.**');

    // Retreive the serverQueue object
    const serverQueue = queue.get(message.guild.id);

    // Throw warnings if the message sender is not in a voice channel or there is no music playing
    if (!message.member.voice.channel)  return message.channel.send(":warning:  **Vous devez être dans un salon vocal pour stooper la musique**");
    if (!serverQueue)   return message.channel.send(":warning:  **Il n'y a pas de musique a stoper.**");

    // Stop the music and bot leave the voice channel
    serverQueue.connection.dispatcher.end();
    message.member.voice.channel.leave();
}

//-------------------- Random song --------------------

/**
* @brief : Return a random song beyond the one chosen
* @param songs : array of the url song
* @return song : chosen url song or null if all songs has been played
*/
function randSong(songs) {
    // Pick a ranom integer among the index of the songs array
    const random = Math.floor(Math.random() * songs.length);
    // Pick the song
    const song =songs[random];
    // If there is a song left, remove the song from the array and return the song
    if (songs.length>0) {   
        songs.splice(random, 1);
        return song;
    }
    // If there is no song left, return null
    else{   return null;    }
}

//-------------------- Send GeoGuessr links --------------------

/**
* @brief : Send the GeoGuessr links in the text channel
* @param message : message object which trow this command
*/
async function sendGGLinks(message) {
    // Initialisation of an increment to print next to the link to orders the links
    var incr=1;

    // For loop (from 0 to 10) to create the links and increment
    for (let i = 0; i < 10; i++) {
        
        // Try carch operator in case of error in the loop => go to next
        try {
            // Create the GeoGuessr links in the text channel
            var url= await createGGLinks();

            // Send url in the channel and increment
            message.channel.send("**"+incr+" - <"+url+">**");
            incr++;
        } 
        catch (error) {
            // Print error log
            console.log("\nERROR : Impossible to create a GeoGuessr link.");
            console.log(error);
        }
    }
}

//-------------------- Create GeoGuessr links --------------------

/**
* @brief : The bot stop play songs of Dua Lipa and leave vocal room
* @param message : message object which trow this command
*/
async function createGGLinks() {

    // Launch the browser (without displaying it)
    const browser = await puppeteer.launch({
        defaultViewport: { width: 1366, height: 768 }, 
        headless:true, 
        args: ['--no-sandbox']
    })

    // Create a new page
    const page = await browser.newPage();

    // On new document create, prevent from Puppertee to be detected
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false    })
    })

    // Set cookies into the browser (connection is automatic) and go to the country streak page
    await page.setCookie(...cookies);
    await page.goto('https://www.geoguessr.com/country-streak/',{waitUntil:'networkidle2'});

    await page.click("img[src='/_next/static/images/challenge-1d4faf410b59a0eec5f27066af9a9f98.png']");

    // Try to click on enabled default settings
    // If we are connected, it will work
    try {
        await page.click(".game-settings__checkbox-main-label");
    } 
    catch (error) {
        // Print error log
        console.log("\nERROR : Impossible to connect to GeoGuessr link, try to re-create cookie file");
        console.log(error);
        return;
    }
    
    // Get the slider element (to choose game time) and his position
    let sliderElement = await page.$('.rangeslider-horizontal');
    let slider = await sliderElement.boundingBox();

    // Click on the slider to get the chosen time (here one minute => 1/8 of the slider)
    await page.mouse.click(slider.x + slider.width / 8, slider.y + slider.height / 2+0.0000001);

    // Click on the no moove option
    await page.click("#__next > div > main > div > div > div > div > div > div > div.card__content > article > div:nth-child(3) > div > div > div.game-settings__detailed-settings > div.game-settings__checkbox.margin--top > div > div.form-field__field > div > label:nth-child(2)");

    // Click n the create game button
    page.click("button[type='button']")
    
    // Wait while the game is creating
    await page.waitForTimeout(2000);

    // Get the game url container
    let urlConainter = await page.$('#__next > div > main > div > div > div > div > div > div > div.card__content > article > div:nth-child(2) > div > section > article > span > input');
    // Retreive the url
    const gameURL = await page.evaluate(urlConainter => urlConainter.value, urlConainter);

    // Close browser and and return game url
    browser.close();
    return(gameURL);
};

// Identify Discord application with its token
client.login(clientLogin);
