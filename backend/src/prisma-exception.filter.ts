import { ArgumentsHost, BadRequestException, Catch, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/**
 * Red de contención para los errores de Prisma que son culpa del cliente y no
 * del servidor. Sin esto llegaban al navegador como 500 "Internal server error".
 *
 * Los controllers que ya capturan estos casos con un mensaje propio siguen
 * ganando: atrapan la excepción antes de que el filtro la vea. Este filtro sólo
 * cubre lo que quedó suelto.
 *
 * Cualquier otro código se deja pasar tal cual: son errores reales de servidor
 * y conviene que fallen ruidosamente en vez de disfrazarse de error de cliente.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (exception.code) {
      // Un parámetro no tiene el formato de la columna: típicamente un id que no es UUID.
      case 'P2023':
        return super.catch(new BadRequestException('El identificador no tiene un formato válido'), host);
      // La operación necesitaba un registro que no existe (findFirstOrThrow, update, delete).
      case 'P2025':
        return super.catch(new NotFoundException('No se encontró el registro solicitado'), host);
      // Choque contra un índice único.
      case 'P2002':
        return super.catch(new ConflictException('Ya existe un registro con esos datos'), host);
      default:
        return super.catch(exception, host);
    }
  }
}
