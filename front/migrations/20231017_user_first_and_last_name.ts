import { UserModel } from "@app/lib/resources/storage/models/user";
import { guessFirstAndLastNameFromFullName } from "@app/lib/user";

async function main() {
  const users: UserModel[] = await UserModel.findAll({
    // Was run with this were but then we make first name non nullable and linter is not happy
    // where: {
    //   firstName: {
    //     [Op.or]: [null, ""],
    //   },
    // },
  });

  console.log(`Found ${users.length} users to update`);

  const chunks = [];
  for (let i = 0; i < users.length; i += 16) {
    chunks.push(users.slice(i, i + 16));
  }

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i}/${chunks.length}...`);
    const chunk = chunks[i];
    await Promise.all(
      chunk.map((u: UserModel) => {
        return (async () => {
          if (!u.firstName) {
            const { firstName, lastName } = guessFirstAndLastNameFromFullName(
              u.name
            );
            return u.update({
              firstName,
              lastName,
            });
          }
        })();
      })
    );
  }
}

main()
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
