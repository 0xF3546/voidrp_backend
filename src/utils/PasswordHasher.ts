import bcrypt from 'bcryptjs';

const saltRounds = 10;

export class PasswordHasher {

  public static async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;
    } catch (error) {
      throw Error("Error while hashing password");
    }
  }

  public static async isPasswordEqual(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const match = await bcrypt.compare(password, hashedPassword);
      return match;
    } catch (error) {
      return false;
    }
  }

  public static async isPasswordValid(password: string): Promise<boolean> {
    const containsUppercase = /[A-Z]/.test(password);

    const containsLowercase = /[a-z]/.test(password);

    const containsNumber = /\d/.test(password);

    const containsSpecialCharacter = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password);

    const length = password.length;

    return containsUppercase && containsNumber && containsSpecialCharacter && containsLowercase && length >= 8;
  }

  public static getRandomPassword() {
    return this.generateRandom(Math.random() * 12);
  }

  private static generateRandom(length: number) {
    var charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }
}