export type TestAccountRole =
  | "course_leader"
  | "mentor"
  | "administrator"
  | "participant"
  | "supporter";

export interface TestAccountDefinition {
  username: string;
  email: string;
  displayName: string;
  role: TestAccountRole;
}

export const testAccountDefinitions = [
  {
    username: "trener",
    email: "trener@rbte.test",
    displayName: "Ведущий курса",
    role: "course_leader",
  },
  {
    username: "tutor",
    email: "tutor@rbte.test",
    displayName: "Наставник",
    role: "mentor",
  },
  {
    username: "Victor57618",
    email: "victor57618@rbte.test",
    displayName: "Victor57618",
    role: "administrator",
  },
  {
    username: "ARB774",
    email: "arb774@rbte.test",
    displayName: "ARB774",
    role: "administrator",
  },
  ...[1, 2, 3, 4, 5].map((number) => ({
    username: `user${number}`,
    email: `user${number}@rbte.test`,
    displayName: `Участник ${number}`,
    role: "participant" as const,
  })),
  {
    username: "helper",
    email: "helper@rbte.test",
    displayName: "Поддерживающее лицо",
    role: "supporter",
  },
] as const satisfies readonly TestAccountDefinition[];

export interface TestAccountSeed extends TestAccountDefinition {
  passwordHash: string;
}

export async function buildTestAccountSeeds(
  environment: Readonly<Record<string, string | undefined>>,
  hashPassword: (password: string) => Promise<string>,
): Promise<TestAccountSeed[]> {
  if (environment.NODE_ENV === "production") {
    throw new Error("Test accounts must never be seeded in production.");
  }

  if (environment.RBTE_ENABLE_TEST_ACCOUNTS !== "true") {
    throw new Error("Set RBTE_ENABLE_TEST_ACCOUNTS=true to seed test accounts.");
  }

  const password = environment.RBTE_TEST_ACCOUNT_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("RBTE_TEST_ACCOUNT_PASSWORD must contain at least 12 characters.");
  }

  const seeds: TestAccountSeed[] = [];
  for (const account of testAccountDefinitions) {
    seeds.push({
      ...account,
      passwordHash: await hashPassword(password),
    });
  }

  return seeds;
}
