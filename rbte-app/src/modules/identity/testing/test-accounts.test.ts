import { describe, expect, it, vi } from "vitest";

import { buildTestAccountSeeds, testAccountDefinitions } from "./test-accounts";

describe("test account definitions", () => {
  it("contains the agreed logins and unique e-mail addresses", () => {
    const usernames = testAccountDefinitions.map(({ username }) => username);
    const emails = testAccountDefinitions.map(({ email }) => email);

    expect(usernames).toEqual(
      expect.arrayContaining([
        "trener",
        "tutor",
        "Victor57618",
        "ARB774",
        "user1",
        "user2",
        "helper",
      ]),
    );
    expect(new Set(usernames).size).toBe(usernames.length);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("assigns the agreed roles", () => {
    const roleByUsername = new Map(
      testAccountDefinitions.map(({ username, role }) => [username, role]),
    );

    expect(roleByUsername.get("trener")).toBe("course_leader");
    expect(roleByUsername.get("tutor")).toBe("mentor");
    expect(roleByUsername.get("Victor57618")).toBe("administrator");
    expect(roleByUsername.get("ARB774")).toBe("administrator");
    expect(roleByUsername.get("user1")).toBe("participant");
    expect(roleByUsername.get("helper")).toBe("supporter");
  });
});

describe("buildTestAccountSeeds", () => {
  it("requires an explicit non-production opt-in and hashes every password", async () => {
    const hashPassword = vi.fn(async (password: string) => `hash:${password}`);
    const seeds = await buildTestAccountSeeds(
      {
        NODE_ENV: "test",
        RBTE_ENABLE_TEST_ACCOUNTS: "true",
        RBTE_TEST_ACCOUNT_PASSWORD: "test-only-password",
      },
      hashPassword,
    );

    expect(seeds).toHaveLength(testAccountDefinitions.length);
    expect(hashPassword).toHaveBeenCalledTimes(testAccountDefinitions.length);
    expect(seeds.every(({ passwordHash }) => passwordHash === "hash:test-only-password")).toBe(
      true,
    );
  });

  it("refuses to seed in production", async () => {
    await expect(
      buildTestAccountSeeds(
        {
          NODE_ENV: "production",
          RBTE_ENABLE_TEST_ACCOUNTS: "true",
          RBTE_TEST_ACCOUNT_PASSWORD: "test-only-password",
        },
        async () => "hash",
      ),
    ).rejects.toThrow("never be seeded in production");
  });
});
