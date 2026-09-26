import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateRecordStatusDto } from '../common/dto/status.dto.js';
import { AllLocationsQueryDto, UpdateLocationDto } from './dto/warehouse.dto.js';
import { LocationsService } from './locations.service.js';

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  /** Locations across all warehouses (optionally one warehouse), for pickers and filters */
  @Get()
  list(@Query() query: AllLocationsQueryDto) {
    return this.locations.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.locations.findOne(id);
  }

  /** Rename / re-code (a location can't move to another warehouse) */
  @Roles('INVENTORY_MANAGER')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLocationDto) {
    return this.locations.update(id, dto);
  }

  /** Activate / deactivate (blocked while the location holds stock) */
  @Roles('INVENTORY_MANAGER')
  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecordStatusDto) {
    return this.locations.setStatus(id, dto.status);
  }
}
