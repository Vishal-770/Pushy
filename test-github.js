import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config({ path: "./.env" });

async function testGitHubToken() {
  try {
    console.log("Testing GitHub token...");

    const headers = {
      "User-Agent": "Discord-Bot-Test",
      Accept: "application/vnd.github.v3+json",
    };

    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
      console.log("Using GitHub token for authentication");
    } else {
      console.log("No GitHub token found - using unauthenticated requests");
    }

    const response = await fetch("https://api.github.com/rate_limit", {
      headers,
    });

    if (!response.ok) {
      console.log(
        "❌ Token test failed:",
        response.status,
        response.statusText
      );
      return;
    }

    const data = await response.json();
    console.log("✅ GitHub API Rate Limit Status:");
    console.log(
      `Core API: ${data.resources.core.remaining}/${data.resources.core.limit} remaining`
    );
    console.log(
      `Search API: ${data.resources.search.remaining}/${data.resources.search.limit} remaining`
    );
    console.log(`Reset time: ${new Date(data.resources.core.reset * 1000)}`);

    // Test a simple user request
    console.log("\nTesting user lookup...");
    const userResponse = await fetch("https://api.github.com/users/octocat", {
      headers,
    });

    if (userResponse.ok) {
      console.log("✅ User lookup successful");
    } else {
      console.log("❌ User lookup failed:", userResponse.status);
    }
  } catch (error) {
    console.error("❌ Error testing GitHub token:", error.message);
  }
}

testGitHubToken();
