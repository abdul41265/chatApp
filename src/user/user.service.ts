import {
    Injectable,
    HttpException,
    HttpStatus,
    CACHE_MANAGER,
    Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { Repository } from 'typeorm';
import { UserRegisterDTO, UserLoginDTO, UserResponseDTO } from './dto';
import { UserLogoutDTO } from './dto/user-logout.dto';
import { SearchService } from '../search/search.service';

/**
 * @class
 * Service handles logic that gets delagated to it by the controller.
 */
@Injectable()
export class UserService {
    // Dependency Injection of userEntity collection inside this service class.
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager,
        @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
        private searchService: SearchService,
    ) {}

    async showAll(): Promise<UserResponseDTO[]> {
        const users = await this.userRepository.find();
        return users.map(user => user.toResponseObject(false));
    }

    async login(data: UserLoginDTO): Promise<UserResponseDTO> {
        const { email, password } = data;
        const user = await this.userRepository.findOne({ where: { email }});
        if (!user || !await user.comparePassword(password)) {
            throw new HttpException('Invalid email/password', HttpStatus.BAD_REQUEST);
        }
        const userResponseObject = user.toResponseObject();
        const { token } = userResponseObject;
        // We don't need to wait we want this to be asynchronous background process,
        // but to handle server errors it's best to use await here to handle unhandled promise errors.
        await this.cacheManager.set(email, token, { ttl: process.env.JWT_EXPIRATION || 604800 });
        return userResponseObject;
    }

    async register(data: UserRegisterDTO): Promise<UserResponseDTO> {
        const { email } = data;
        let user = await this.userRepository.findOne({ where: { email } });
        if (user) {
            throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
        }
        user = this.userRepository.create(data);
        await this.userRepository.save(user);
        const userResponseObject = user.toResponseObject();
        const { token } = userResponseObject;
        // We don't need to wait we want this to be asynchronous background process.
        this.cacheManager.set(email, token, { ttl: process.env.JWT_EXPIRATION || 604800 });
        const userIndexDocument = { ...userResponseObject };
        if (userIndexDocument) {
            delete userIndexDocument.token;
        }
       // await this.searchService.index('user', userIndexDocument);
        return userResponseObject;
    }

    logout(data: UserLogoutDTO): void {
        const { from } = data;
        this.cacheManager.del(from);
    }
}
