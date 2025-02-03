// Client-side React component declaration
"use client";
import React, { useState, useRef } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


// Utility function to format numbers with commas (e.g., 1000000 -> 1,000,000)
const formatNumberWithCommas = (value: string | number): string => {
  if (!value && value !== 0) return '';
  const number = value.toString().replace(/,/g, '');
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Utility function to remove commas from numbers for calculations
const parseNumberWithCommas = (value: string): string => {
  if (!value) return '';
  return value.toString().replace(/,/g, '');
};

// Formats numbers into currency with K/M/B suffixes (e.g., $1.2M)
const formatAxisLabel = (value: number): string => {
  if (!value && value !== 0) return '$0';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

// TypeScript interface defining the structure of an insurance layer
interface Layer {
  id: number;
  insurer: string;
  limit: string;
  attachment: string;
  premium: string;
  share: string;
  layerType: 'quotashare' | 'primary' | 'xol';
  color: string;
}

// Main MudMap component
const MudMap = () => {
  // Initialize state with a single empty layer
  const [layers, setLayers] = useState<Layer[]>([{
    id: 1,
    insurer: '',
    limit: '',
    attachment: '',
    premium: '',
    share: '',
    layerType: 'primary',
    color: `hsl(${Math.random() * 360}, 70%, 50%)`  // Random color for the layer
  }]);

  // State for the total policy limit
  const [totalLimit, setTotalLimit] = useState('');

  // Handles number input changes, removing commas before updating state
  const handleNumberInputChange = (id: number, field: keyof Layer, value: string) => {
    const parsedValue = parseNumberWithCommas(value);
    updateLayer(id, field, parsedValue);
  };

  // Handles changes to the total limit input
  const handleTotalLimitChange = (value: string) => {
    setTotalLimit(parseNumberWithCommas(value));
  };

  // Updates layer type and resets attachment point for quota share/primary layers
  const handleLayerTypeChange = (id: number, newType: Layer['layerType']) => {
    setLayers(layers.map(layer => {
      if (layer.id === id) {
        return {
          ...layer,
          layerType: newType,
          attachment: (newType === 'quotashare' || newType === 'primary') ? '0' : layer.attachment
        };
      }
      return layer;
    }));
  };

  // Adds a new layer with a unique ID and random color
  const addLayer = () => {
    const newId = Math.max(...layers.map(l => l.id)) + 1;
    setLayers([...layers, {
      id: newId,
      insurer: '',
      limit: '',
      attachment: '',
      premium: '',
      share: '',
      layerType: 'primary',
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    }]);
  };

  // Removes a layer if there's more than one layer
  const removeLayer = (id: number) => {
    if (layers.length > 1) {
      setLayers(layers.filter(layer => layer.id !== id));
    }
  };

  // Updates a specific field in a layer
  const updateLayer = (id: number, field: keyof Layer, value: string) => {
    setLayers(layers.map(layer =>
      layer.id === id ? { ...layer, [field]: value } : layer
    ));
  };

  // Calculates positions for different types of layers in the visualization
  const calculateLayerPositions = () => {
    // Sort layers by premium within their respective types
    const quotaShareLayers = layers
      .filter(l => l.layerType === 'quotashare')
      .sort((a, b) => (parseFloat(a.premium) || 0) - (parseFloat(b.premium) || 0));

    const primaryLayers = layers
      .filter(l => l.layerType === 'primary')
      .sort((a, b) => (parseFloat(a.premium) || 0) - (parseFloat(b.premium) || 0));

    const xolLayers = layers
      .filter(l => l.layerType === 'xol')
      .sort((a, b) => (parseFloat(a.premium) || 0) - (parseFloat(b.premium) || 0));

    // Calculate total width of quota share layers
    const quotaShareWidth = quotaShareLayers.reduce((sum, layer) =>
      sum + (parseFloat(layer.share) || 0), 0);

    return { quotaShareLayers, primaryLayers, xolLayers, quotaShareWidth };
  };

  // Calculate total share percentage across all layers
  const totalShare = layers.reduce((sum, layer) => 
    sum + (parseFloat(layer.share) || 0), 0);

  const LayerVisualization = () => {
    const layerVisualizationRef = useRef(null);

    // Export function to handle both Excel and Image export
    const exportLayersAndImage = async () => {
      try {
        // 1. Prepare Excel Export
        const exportData = layers.map(layer => ({
          'Layer Type': layer.layerType,
          'Insurer': layer.insurer,
          'Limit (USD)': parseFloat(layer.limit),
          'Attachment (USD)': parseFloat(layer.attachment),
          'Premium (USD)': parseFloat(layer.premium),
          'Share (%)': parseFloat(layer.share),
          'Color': layer.color
        }));

        console.log('Export Data:', exportData);  // Debug data

        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Layers');

        // 2. Export Image
        if (layerVisualizationRef.current) {
          try {
            // Capture the layer visualization as an image
            const canvas = await html2canvas(layerVisualizationRef.current, {
              scale: 2,  // Increases resolution
              useCORS: true  // Helps with cross-origin images
            });

            // Convert canvas to blob
            canvas.toBlob((blob) => {
              console.log('Blob:', blob);  // Debug blob

              if (blob) {
                import('jszip').then((JSZip) => {
                  const zip = new JSZip.default();

                  // Add Excel file to ZIP
                  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                  zip.file('MudMap_Layers.xlsx', excelBuffer);

                  // Add PNG to ZIP
                  zip.file('MudMap_Visualization.png', blob);

                  // Generate and save ZIP
                  zip.generateAsync({ type: 'blob' }).then((content) => {
                    console.log('ZIP Content:', content);  // Debug ZIP content
                    saveAs(content, 'MudMap_Export.zip');
                  });
                });
              } else {
                console.error("Failed to create blob from canvas");
              }
            });
          } catch (error) {
            console.error('Error in image export:', error);
          }
        } else {
          console.error('Layer visualization reference is null');
        }
      } catch (error) {
        console.error('Export error:', error);
      }
    };

    // Renders the visual representation of layers
    const renderLayers = () => {
      const { quotaShareLayers, primaryLayers, xolLayers, quotaShareWidth } = calculateLayerPositions();
      const totalLimitNum = parseFloat(totalLimit) || 0;
      const layerElements: JSX.Element[] = [];

      let currentPosition = 0;

      // Render quota share layers side by side
      quotaShareLayers.forEach(layer => {
        const limit = parseFloat(layer.limit) || 0;
        const share = parseFloat(layer.share) || 0;
        
        if (limit && share && totalLimitNum) {
          layerElements.push(
            <div
              key={`qs-${layer.id}`}
              className="absolute border"
              style={{
                height: `${(limit / totalLimitNum) * 100}%`,
                width: `${share}%`,
                bottom: '0%',
                left: `${currentPosition}%`,
                backgroundColor: `${layer.color}b3`,
                borderColor: layer.color
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-xs">
                {layer.insurer}<br />
                {formatAxisLabel(parseFloat(layer.premium))}<br />
                {share}%
              </div>
            </div>
          );
          currentPosition += share;
        }
      });

      // Render primary layers and their corresponding XoL layers
      primaryLayers.forEach(primary => {
        const primaryLimit = parseFloat(primary.limit) || 0;
        const primaryShare = parseFloat(primary.share) || 0;

        if (primaryLimit && primaryShare && totalLimitNum) {
          // Render primary layer
          layerElements.push(
            <div
              key={`p-${primary.id}`}
              className="absolute border"
              style={{
                height: `${(primaryLimit / totalLimitNum) * 100}%`,
                width: `${primaryShare}%`,
                bottom: '0%',
                left: `${currentPosition}%`,
                backgroundColor: `${primary.color}b3`,
                borderColor: primary.color
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-xs">
                {primary.insurer}<br />
                {formatAxisLabel(primaryLimit)}<br />
                {primaryShare}%
              </div>
            </div>
          );

          // Find and render matching XoL layer
          const matchingXol = xolLayers.find(xol =>
            parseFloat(xol.attachment) === primaryLimit
          );

          if (matchingXol) {
            const xolLimit = parseFloat(matchingXol.limit) || 0;
            const xolShare = parseFloat(matchingXol.share) || 0;
            const attachment = parseFloat(matchingXol.attachment) || 0;

            if (xolLimit && xolShare && attachment) {
              layerElements.push(
                <div
                  key={`x-${matchingXol.id}`}
                  className="absolute border"
                  style={{
                    height: `${(xolLimit / totalLimitNum) * 100}%`,
                    width: `${xolShare}%`,
                    bottom: `${(attachment / totalLimitNum) * 100}%`,
                    left: `${currentPosition}%`,
                    backgroundColor: `${matchingXol.color}b3`,
                    borderColor: matchingXol.color,
                    zIndex: 2
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs">
                    {matchingXol.insurer}<br />
                    {formatAxisLabel(xolLimit)}<br />
                    {xolShare}%
                  </div>
                </div>
              );
            }
          }
          currentPosition += primaryShare;
        }
      });

      return layerElements;
    };

    // Component JSX rendering the UI
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>MudMap Layer Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Label htmlFor="totalLimit">Total Policy Limit (USD)</Label>
              <Input
                id="totalLimit"
                value={formatNumberWithCommas(totalLimit)}
                onChange={(e) => handleTotalLimitChange(e.target.value)}
                placeholder="Enter total policy limit"
                className="mt-1"
              />
            </div>

            {totalShare > 100 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Total share exceeds 100% ({totalShare.toFixed(2)}%)
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-6 gap-4 font-bold mb-2">
              <div>Layer Type</div>
              <div>Insurer</div>
              <div>Limit (USD)</div>
              <div>Attachment (USD)</div>
              <div>Premium (USD)</div>
              <div>Share (%)</div>
            </div>

            {layers.map((layer) => (
              <div key={layer.id} className="grid grid-cols-6 gap-4 items-center mb-2">
                <select
                  value={layer.layerType}
                  onChange={(e) => handleLayerTypeChange(layer.id, e.target.value as Layer['layerType'])}
                  className="w-full rounded border border-gray-300 p-2"
                >
                  <option value="quotashare">Quota Share</option>
                  <option value="primary">Primary</option>
                  <option value="xol">XoL</option>
                </select>

                <Input
                  value={layer.insurer}
                  onChange={(e) => updateLayer(layer.id, 'insurer', e.target.value)}
                  placeholder="Insurer name"
                />

                <Input
                  value={formatNumberWithCommas(layer.limit)}
                  onChange={(e) => handleNumberInputChange(layer.id, 'limit', e.target.value)}
                  placeholder="Limit"
                />

                <Input
                  value={formatNumberWithCommas(layer.attachment)}
                  onChange={(e) => handleNumberInputChange(layer.id, 'attachment', e.target.value)}
                  placeholder="Attachment"
                  disabled={layer.layerType === 'quotashare' || layer.layerType === 'primary'}
                />

                <Input
                  value={formatNumberWithCommas(layer.premium)}
                  onChange={(e) => handleNumberInputChange(layer.id, 'premium', e.target.value)}
                  placeholder="Premium"
                />

                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={layer.share}
                    onChange={(e) => updateLayer(layer.id, 'share', e.target.value)}
                    placeholder="Share %"
                    className={parseFloat(layer.share) > 100 ? 'border-red-500' : ''}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLayer(layer.id)}
                    disabled={layers.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button onClick={addLayer} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Layer
            </Button>

            <div 
            ref={layerVisualizationRef}  // Attach the ref here
            className="border border-gray-300 bg-white my-8 relative h-96">
              {[0, 25, 50, 75, 100].map((percent) => (
                <div
                  key={`v-${percent}`}
                  className="absolute h-full border-l border-gray-200"
                  style={{ left: `${percent}%` }}
                >
                  <div className="absolute bottom-0 transform translate-y-full mt-2 text-sm">
                    {percent}%
                  </div>
                </div>
              ))}

              {[0, 25, 50, 75, 100].map((percent) => (
                <div
                  key={`h-${percent}`}
                  className="absolute w-full border-t border-gray-200"
                  style={{ bottom: `${percent}%` }}
                >
                  <div className="absolute -left-20 transform -translate-y-1/2 text-sm">
                    {formatAxisLabel((parseFloat(totalLimit) || 0) * (percent / 100))}
                  </div>
                </div>
              ))}

              {renderLayers()}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Total Policy Limit:</span>
                  <span className="ml-2">{formatAxisLabel(parseFloat(totalLimit))}</span>
                </div>
                <div>
                  <span className="font-medium">Total Share:</span>
                  <span className="ml-2">{totalShare.toFixed(2)}%</span>
                </div>
              </div>
            </div>
            <Button id="export-button" onClick={exportLayersAndImage} className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Export Layers and Image
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };
};

export default MudMap;

