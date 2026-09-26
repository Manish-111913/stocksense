import { BadRequestException, ConflictException } from '@nestjs/common';

// Stock errors carry a machine-readable `error` code plus details for the UI

export interface InsufficientStockDetails {
  productId: string;
  sku: string;
  productName: string;
  locationId: string;
  locationName: string;
  unitOfMeasure: string;
  available: number;
  requested: number;
}

/** A delivery / transfer asked for more than the location holds; nothing was changed */
export class InsufficientStockException extends ConflictException {
  constructor(readonly details: InsufficientStockDetails) {
    super({
      statusCode: 409,
      error: 'INSUFFICIENT_STOCK',
      code: 'INSUFFICIENT_STOCK',
      available: details.available,
      requested: details.requested,
      message: `Insufficient stock for ${details.sku} at ${details.locationName}: ${details.available} ${details.unitOfMeasure} available, ${details.requested} ${details.unitOfMeasure} requested`,
      details,
    });
  }
}

export interface StaleStockDetails {
  productId: string;
  locationId: string;
  expectedQuantity?: number;
  currentQuantity: number;
  expectedVersion?: number;
  currentVersion: number;
}

/** Stock changed after the adjustment's recorded quantity was read (STOCK_CHANGED_SINCE_ADJUSTMENT): recount */
export class StaleStockException extends ConflictException {
  constructor(readonly details: StaleStockDetails) {
    super({
      statusCode: 409,
      error: 'STOCK_CHANGED_SINCE_ADJUSTMENT',
      code: 'STOCK_CHANGED_SINCE_ADJUSTMENT',
      message: `Stock changed after this adjustment was created (now ${details.currentQuantity}). Recount and enter the new physical quantity, or create a new adjustment.`,
      details,
    });
  }
}

/** Unknown / inactive product, location or warehouse, or an invalid quantity */
export class InvalidStockOperationException extends BadRequestException {
  constructor(message: string) {
    super({ statusCode: 400, error: 'INVALID_STOCK_OPERATION', code: 'INVALID_STOCK_OPERATION', message });
  }
}
