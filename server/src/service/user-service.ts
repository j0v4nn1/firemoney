import User, { TUser } from '../models/users';
import bcrypt from 'bcrypt';
import TokenService from './token-service';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../errors/api-error';

class UserService {
  async registration(userFields: TUser) {
    const { password, ...rest } = userFields;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUSer = await User.create({ ...rest, password: hashedPassword });
    if (!newUSer) {
      throw ApiError.serverSideError('создание пользователя');
    }
    const { _id, email } = newUSer;
    return {
      _id,
    };
  }

  async login(_id: string | JwtPayload, password: string, payload: { name: string; email: string; passport: string }) {
    const user = await User.findById(_id);
    if (!user) {
      throw ApiError.serverSideError('пользователь');
    }
    const hashedPassword = user.password;
    const isCorrectPassword = await bcrypt.compare(password, hashedPassword);
    if (!isCorrectPassword) {
      throw ApiError.unauthorizedError();
    }
    const tokens = TokenService.generateTokens({ id: user._id.toString(), ...payload });
    await TokenService.saveToken(user._id, tokens.refreshToken);
    const { email } = user;
    return { ...tokens, _id: user._id, email };
  }

  async auth(_id: string | JwtPayload) {
    const user = await User.findById(_id, ['name', 'email', 'role', 'passport']);
    if (!user) {
      throw ApiError.serverSideError('пользователь');
    }
    return user;
  }

  async deleteUser(userId: string, refreshToken: string) {
    const token = await TokenService.deleteToken(refreshToken);
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw ApiError.serverSideError('удаление пользователя');
    }
    return { token, user };
  }
}

export default new UserService();
