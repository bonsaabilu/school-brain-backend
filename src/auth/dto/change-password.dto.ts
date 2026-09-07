import {
    IsString,
    MinLength,
    Matches,
} from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    currentPassword: string;

    @IsString()
    @MinLength(8)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/,
        {
            message:
                'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        },
    )
    newPassword: string;
}