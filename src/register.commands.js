import dotenv from "dotenv";
import { ApplicationCommandOptionType, REST, Routes } from "discord.js";
dotenv.config({ path: "./.env" });
const commands = [
  {
    name: "hey",
    description: "Replies with Hey!",
  },
  {
    name: "info",
    description: "Info About the Bot",
  },
  {
    name: "add",
    description: "Add two numbers",
    options: [
      {
        name: "first_number", // all lowercase
        description: "The first number",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
      {
        name: "second_number", // all lowercase
        description: "The second number",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
    ],
  },
  {
    name: "github",
    description: "Get GitHub user information",
    options: [
      {
        name: "username",
        description: "GitHub username to look up",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
const register = async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.SERVER_ID
      ),
      {
        body: commands,
      }
    );
    console.log("Registered SuccessFully");
  } catch (err) {
    console.log(err);
  }
};
register();
