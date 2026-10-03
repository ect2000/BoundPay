'use client';
import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import type { RankedProduct, SpendingMandate } from '@/lib/domain';
import { money } from '@/lib/money';
ModuleRegistry.registerModules([AllCommunityModule]);
const theme = themeQuartz.withParams({
  backgroundColor: '#11161e',
  foregroundColor: '#d7deea',
  borderColor: '#252d3a',
  headerBackgroundColor: '#151b24',
  headerTextColor: '#8d99ab',
  rowHoverColor: '#192435',
  selectedRowBackgroundColor: '#182b44',
  accentColor: '#6da8ff',
  fontFamily: 'Arial, sans-serif',
  fontSize: 12,
  headerFontSize: 11,
  spacing: 6,
  browserColorScheme: 'dark',
});
export default function ProductGrid({
  rows,
  mandate,
  onSelect,
  filter,
  compact,
}: {
  rows: RankedProduct[];
  mandate: SpendingMandate;
  onSelect: (p: RankedProduct) => void;
  filter: string;
  compact: boolean;
}) {
  const columns = useMemo<ColDef<RankedProduct>[]>(
    () => [
      {
        headerName: 'PRODUCT / MERCHANT',
        colId: 'product',
        valueGetter: (p) => p.data?.product.title,
        pinned: 'left',
        width: 260,
        minWidth: 200,
        filter: 'agTextColumnFilter',
        cellRenderer: (p: ICellRendererParams<RankedProduct>) => (
          <div className="grid-product">
            <strong>{p.data?.product.title}</strong>
            <span>{p.data?.product.merchant}</span>
          </div>
        ),
      },
      {
        headerName: 'UNIT PRICE',
        valueGetter: (p) => p.data?.product.unitPrice,
        valueFormatter: (p) => money(p.value, mandate.currency),
        width: 120,
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: 'BASKET TOTAL',
        valueGetter: (p) => (p.data?.product.unitPrice ?? 0) * mandate.quantity,
        valueFormatter: (p) => money(p.value, mandate.currency),
        width: 140,
        cellClassRules: { 'grid-fail': (p) => p.value > mandate.maxTotal },
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: 'RATING',
        valueGetter: (p) => p.data?.product.rating,
        valueFormatter: (p) => (p.value === null ? 'Unknown' : `${p.value} / 5`),
        width: 105,
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: 'DELIVERY',
        valueGetter: (p) => p.data?.product.deliveryDate ?? 'Unknown',
        width: 130,
      },
      {
        headerName: 'FEATURES',
        valueGetter: (p) =>
          `${p.data?.product.displaySize ?? '?'}″ · USB-C ${p.data?.product.usbC === null ? '?' : p.data?.product.usbC ? '✓' : '×'}`,
        width: 140,
      },
      {
        headerName: 'SCORE',
        field: 'score',
        width: 100,
        filter: 'agNumberColumnFilter',
        cellRenderer: (p: ICellRendererParams<RankedProduct>) => (
          <span className="grid-score">
            {p.value}
            <span>/100</span>
          </span>
        ),
      },
      {
        headerName: 'POLICY',
        valueGetter: (p) =>
          p.data?.eligible
            ? 'Eligible'
            : p.data?.status === 'needs_evidence'
              ? 'Needs evidence'
              : 'Rejected',
        width: 115,
        pinned: 'right',
        cellRenderer: (p: ICellRendererParams<RankedProduct>) => (
          <span
            className={`status-chip ${p.data?.eligible ? 'safe' : p.data?.status === 'needs_evidence' ? 'amber-chip' : 'danger'}`}
          >
            {p.data?.eligible
              ? '✓ Eligible'
              : p.data?.status === 'needs_evidence'
                ? '? Needs evidence'
                : '× Rejected'}
          </span>
        ),
      },
      {
        headerName: 'CONSTRAINT FAILURES',
        valueGetter: (p) =>
          [...(p.data?.failures ?? []), ...(p.data?.missingEvidence ?? [])].join('; ') ||
          'All hard requirements satisfied',
        width: 320,
      },
      {
        headerName: 'VALUE',
        valueGetter: (p) => Math.round(p.data?.scores.value ?? 0),
        width: 100,
        hide: true,
      },
      {
        headerName: 'QUALITY',
        valueGetter: (p) => Math.round(p.data?.scores.quality ?? 0),
        width: 100,
        hide: true,
      },
      {
        headerName: 'PREFERENCE',
        valueGetter: (p) => Math.round(p.data?.scores.preference ?? 0),
        width: 120,
        hide: true,
      },
    ],
    [mandate],
  );
  return (
    <div className="product-grid" style={{ height: compact ? 390 : 470 }}>
      <AgGridReact<RankedProduct>
        theme={theme}
        rowData={rows}
        columnDefs={columns}
        defaultColDef={{ sortable: true, resizable: true, filter: true }}
        rowHeight={compact ? 48 : 64}
        headerHeight={42}
        rowSelection={{ mode: 'singleRow', enableClickSelection: true, checkboxes: false }}
        quickFilterText={filter}
        onRowClicked={(e) => {
          if (e.data) onSelect(e.data);
        }}
        getRowId={(p) => p.data.product.id}
        tooltipShowDelay={200}
        enableCellTextSelection
      />
    </div>
  );
}
