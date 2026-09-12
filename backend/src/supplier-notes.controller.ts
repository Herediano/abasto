import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { SupplierNotesService } from './supplier-notes.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SupplierNotesController {
  constructor(@Inject(SupplierNotesService) private readonly notes: SupplierNotesService) {}

  @Get('suppliers/:supplierId/notes') @RequirePermission('proveedores.ver')
  listForSupplier(@Req() request: AuthRequest, @Param('supplierId') supplierId: string) {
    return this.notes.listForSupplier(request.user.tenantId, supplierId);
  }

  @Get('suppliers/:supplierId/notable-invoices') @RequirePermission('proveedores.ver')
  notableInvoices(@Req() request: AuthRequest, @Param('supplierId') supplierId: string) {
    return this.notes.notableInvoices(request.user.tenantId, supplierId);
  }

  @Post('suppliers/:supplierId/notes') @RequirePermission('compras.corregir')
  create(@Req() request: AuthRequest, @Param('supplierId') supplierId: string, @Body() body: Record<string, unknown>) {
    return this.notes.create(request.user, supplierId, body);
  }

  @Get('purchases/invoices/:invoiceId/supplier-notes') @RequirePermission('compras.ver')
  listForInvoice(@Req() request: AuthRequest, @Param('invoiceId') invoiceId: string) {
    return this.notes.listForInvoice(request.user.tenantId, invoiceId);
  }

  @Get('supplier-notes/:id') @RequirePermission('proveedores.ver')
  get(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.notes.get(request.user.tenantId, id);
  }
}
