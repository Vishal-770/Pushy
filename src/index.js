import dotenv from "dotenv";
import fetch from "node-fetch";
import { Client, IntentsBitField, EmbedBuilder } from "discord.js";

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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand) return;
  console.log(interaction.commandName);

  if (interaction.commandName === "hey") {
    interaction.reply("HI");
  }

  if (interaction.commandName == "info") {
    interaction.reply("Iam a Bot");
  }

  if (interaction.commandName == "add") {
    const num1 = interaction.options.get("first_number");
    const num2 = interaction.options.get("second_number");
    console.log(num1.value, num2.value);
    interaction.reply(`${num1.value + num2.value}`);
  }

  if (interaction.commandName === "github") {
    const username = interaction.options.getString("username");

    try {
      // Defer reply since API calls might take time
      await interaction.deferReply();

      // GitHub API headers with authentication
      const githubHeaders = {
        "User-Agent": "Discord-Bot-GitHub-Lookup",
        Accept: "application/vnd.github.v3+json",
      };

      // Add authorization if GitHub token is available
      if (process.env.GITHUB_TOKEN) {
        githubHeaders["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
      }

      // Fetch user data from GitHub API
      const userResponse = await fetch(
        `https://api.github.com/users/${username}`,
        { headers: githubHeaders }
      );

      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          return interaction.editReply({
            content: `❌ **User not found!** No GitHub user with username \`${username}\` exists.`,
          });
        } else if (userResponse.status === 403) {
          // Check if it's rate limiting or token issue
          const remaining = userResponse.headers.get("x-ratelimit-remaining");
          const resetTime = userResponse.headers.get("x-ratelimit-reset");

          if (remaining === "0") {
            const resetDate = new Date(resetTime * 1000);
            return interaction.editReply({
              content: `❌ **API Rate limit exceeded!** Limit resets at ${resetDate.toLocaleTimeString()}. Please try again later.`,
            });
          } else {
            return interaction.editReply({
              content:
                "❌ **Authentication Error!** GitHub API access denied. Please check the bot configuration.",
            });
          }
        } else {
          return interaction.editReply({
            content: `❌ **Error!** Unable to fetch user data from GitHub API. (Status: ${userResponse.status})`,
          });
        }
      }

      const userData = await userResponse.json();

      // Log rate limit info for debugging
      const rateLimit = userResponse.headers.get("x-ratelimit-limit");
      const rateLimitRemaining = userResponse.headers.get(
        "x-ratelimit-remaining"
      );
      const rateLimitReset = userResponse.headers.get("x-ratelimit-reset");

      console.log(
        `GitHub API Rate Limit: ${rateLimitRemaining}/${rateLimit} remaining. Resets at: ${new Date(
          rateLimitReset * 1000
        )}`
      );

      // Fetch user repositories
      const reposResponse = await fetch(
        `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
        { headers: githubHeaders }
      );
      let reposData = [];
      let totalCommits = 0;
      let commitsThisYear = 0;
      let totalStars = 0;
      let totalForks = 0;
      let languageStats = {};

      if (reposResponse.ok) {
        reposData = await reposResponse.json();

        // Calculate various repository statistics
        totalStars = reposData.reduce(
          (sum, repo) => sum + repo.stargazers_count,
          0
        );
        totalForks = reposData.reduce((sum, repo) => sum + repo.forks_count, 0);

        // Count languages
        reposData.forEach((repo) => {
          if (repo.language) {
            languageStats[repo.language] =
              (languageStats[repo.language] || 0) + 1;
          }
        });

        // Calculate total commits (simplified - using pushed_at as indicator of activity)
        totalCommits = reposData.filter((repo) => repo.pushed_at).length;

        // Get commits for current year (2025)
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(`${currentYear}-01-01`).toISOString();

        // Fetch commits for each repository to get current year count
        const commitPromises = reposData.slice(0, 20).map(async (repo) => {
          // Limit to first 20 repos to avoid rate limits
          try {
            const commitsResponse = await fetch(
              `https://api.github.com/repos/${repo.owner.login}/${repo.name}/commits?author=${username}&since=${startOfYear}&per_page=100`,
              { headers: githubHeaders }
            );
            if (commitsResponse.ok) {
              const commits = await commitsResponse.json();
              return commits.length;
            }
          } catch (error) {
            console.log(
              `Error fetching commits for ${repo.name}:`,
              error.message
            );
          }
          return 0;
        });

        const commitCounts = await Promise.all(commitPromises);
        commitsThisYear = commitCounts.reduce((sum, count) => sum + count, 0);
      }

      // Get top 3 repositories by stars
      const topRepos = reposData
        .filter((repo) => !repo.fork && repo.stargazers_count > 0)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 3);

      // Create badges based on stats
      const getBadge = (count, type) => {
        if (type === "followers") {
          if (count >= 1000) return "🌟 Popular";
          if (count >= 100) return "👥 Well-Known";
          if (count >= 10) return "👤 Active";
          return "🔰 New";
        }
        if (type === "repos") {
          if (count >= 50) return "🚀 Prolific";
          if (count >= 20) return "📚 Active Developer";
          if (count >= 5) return "💻 Developer";
          return "🌱 Starting";
        }
        return "";
      };

      // Get top languages
      const topLanguages =
        Object.entries(languageStats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([lang, count]) => `${lang} (${count})`)
          .join(", ") || "Not specified";

      // Calculate account age
      const joinDate = new Date(userData.created_at);
      const accountAge = Math.floor(
        (new Date() - joinDate) / (365.25 * 24 * 60 * 60 * 1000)
      );
      const formattedJoinDate = joinDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Build enhanced embed
      const embed = new EmbedBuilder()
        .setColor("#24292e")
        .setAuthor({
          name: `${userData.login}${
            userData.name ? ` (${userData.name})` : ""
          }`,
          iconURL: userData.avatar_url,
          url: userData.html_url,
        })
        .setThumbnail(userData.avatar_url)
        .setDescription(userData.bio || "*No bio available*")
        .setURL(userData.html_url);

      // Add comprehensive stats
      embed.addFields({
        name: "📊 **GitHub Statistics**",
        value: `👥 **Followers:** ${userData.followers.toLocaleString()} ${getBadge(
          userData.followers,
          "followers"
        )}
👤 **Following:** ${userData.following.toLocaleString()}
📚 **Public Repos:** ${userData.public_repos.toLocaleString()} ${getBadge(
          userData.public_repos,
          "repos"
        )}
💾 **Public Gists:** ${userData.public_gists.toLocaleString()}
⭐ **Total Stars:** ${totalStars.toLocaleString()}
🍴 **Total Forks:** ${totalForks.toLocaleString()}`,
        inline: true,
      });

      // Add commit statistics
      embed.addFields({
        name: "💻 **Commit Activity**",
        value: `📈 **Commits in ${new Date().getFullYear()}:** ${commitsThisYear.toLocaleString()}
🔥 **Active Repos:** ${totalCommits}
📅 **Account Age:** ${accountAge} year${accountAge !== 1 ? "s" : ""}
🛠️ **Top Languages:** ${topLanguages}`,
        inline: true,
      });

      // Add account details
      embed.addFields({
        name: "� **Profile Details**",
        value: `🗓️ **Joined:** ${formattedJoinDate}
🏢 **Company:** ${userData.company || "*Not specified*"}
📍 **Location:** ${userData.location || "*Not specified*"}
📧 **Email:** ${userData.email || "*Not public*"}
📝 **Hireable:** ${
          userData.hireable === null
            ? "*Not specified*"
            : userData.hireable
            ? "✅ Yes"
            : "❌ No"
        }`,
        inline: false,
      });

      // Add top repositories if any
      if (topRepos.length > 0) {
        const repoText = topRepos
          .map((repo) => {
            const updatedDate = new Date(repo.updated_at).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric" }
            );
            const description = repo.description
              ? repo.description.substring(0, 80) +
                (repo.description.length > 80 ? "..." : "")
              : "*No description*";

            return `⭐ **[${repo.name}](${repo.html_url})** \`${
              repo.stargazers_count
            }⭐\` \`${repo.forks_count}🍴\`
${repo.language ? `🔸 ${repo.language}` : ""} • Updated ${updatedDate}
*${description}*`;
          })
          .join("\n\n");

        embed.addFields({
          name: "� **Top Repositories**",
          value: repoText,
          inline: false,
        });
      }

      // Add social links and additional information
      const socialLinks = [];
      if (userData.blog) {
        const blogUrl = userData.blog.startsWith("http")
          ? userData.blog
          : `https://${userData.blog}`;
        socialLinks.push(`🌐 [Website/Blog](${blogUrl})`);
      }
      if (userData.twitter_username)
        socialLinks.push(
          `🐦 [Twitter](https://twitter.com/${userData.twitter_username})`
        );

      // Add GitHub-specific links
      socialLinks.push(`💻 [GitHub Profile](${userData.html_url})`);
      socialLinks.push(
        `📦 [Repositories](${userData.html_url}?tab=repositories)`
      );
      if (userData.followers > 0) {
        socialLinks.push(`👥 [Followers](${userData.html_url}?tab=followers)`);
      }
      if (userData.public_gists > 0) {
        socialLinks.push(
          `📝 [Gists](https://gist.github.com/${userData.login})`
        );
      }

      if (socialLinks.length > 0) {
        embed.addFields({
          name: "🔗 **Links & Social**",
          value: socialLinks.join(" • "),
          inline: false,
        });
      }

      // Add footer with rate limit info
      const footerText = `GitHub API • ${rateLimitRemaining}/${rateLimit} requests remaining • Requested by ${interaction.user.username}`;
      embed.setFooter({
        text: footerText,
        iconURL:
          "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
      });

      embed.setTimestamp();

      // Add a color indicator based on activity
      if (commitsThisYear > 100) {
        embed.setColor("#28a745"); // Green for very active
      } else if (commitsThisYear > 50) {
        embed.setColor("#ffd33d"); // Yellow for active
      } else if (commitsThisYear > 0) {
        embed.setColor("#fd7e14"); // Orange for somewhat active
      } else {
        embed.setColor("#6c757d"); // Gray for inactive
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("GitHub API Error:", error);
      await interaction.editReply({
        content:
          "❌ **Error!** Something went wrong while fetching GitHub data. Please try again later.",
      });
    }
  }
});

client.login(process.env.TOKEN);
