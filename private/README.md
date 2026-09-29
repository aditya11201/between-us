# Private Important mail

`mail.json` in this folder is the plaintext love letter. It is gitignored on purpose:
the repo is public, so the letter must never be committed.

## How to edit the Important mailbox letter

1. Edit `private/mail.json` (array with one message object — see `mail.example.json` for the fields).
2. Re-encrypt it:

   ```
   IMPORTANT_PWD=<the-real-password> npm run encrypt:mail
   ```

   (Type the real password in your shell; it is never written to any committed
   file — do NOT put the literal password in this README. The repo is public.)
3. Commit the new ciphertext:

   ```
   git add public/important-mail.enc.json
   git commit -m "feat(mail): update Important letter"
   git push
   ```

GitHub Actions builds and deploys as usual — it never needs the password because
`public/important-mail.enc.json` is already encrypted.
