import dotenv from "dotenv";

import { Client, IntentsBitField } from "discord.js";

dotenv.config({ path: "./.env" });
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.MessageContent,
  ],
});
client.on("clientReady", (c) => {
  console.log("Bot Ready " + c.user.username + " " + c.user.tag);
});

// client.on("messageCreate", (message) => {
//   if (message.author.bot) return;
//   console.log(message.content);
//   message.reply("Hi");
// });

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand) return;
  console.log(interaction.commandName);
  if (interaction.commandName === "hey") interaction.reply("HI");
  if (interaction.commandName == "info") interaction.reply("Iam a Bot");
  if (interaction.commandName == "add") {
    const num1 = interaction.options.get("first_number");
    const num2 = interaction.options.get("second_number");
    console.log(num1.value, num2.value);
    interaction.reply(`${num1.value + num2.value}`);
  }
});

client.login(process.env.TOKEN);
