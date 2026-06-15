import { Label } from '../atoms'
import ImageSourceField from './ImageSourceField'

export default function ProductBuilder({ value, onChange }) {
  const product = value || {
    businessOwnerJid: '0@s.whatsapp.net',
    body: '',
    footer: '',
    title: '',
    description: '',
    currencyCode: 'IDR',
    priceAmount1000: '',
    salePriceAmount1000: '',
    url: '',
    signedUrl: '',
    productId: '',
    retailerId: '',
    imageUrl: '',
    imageDataUrl: '',
  }

  const update = (patch) => onChange({ ...product, ...patch })

  return (
    <div className="space-y-3">
      <Label>Product message</Label>
      <input
        className="input-base"
        placeholder="Business owner JID"
        value={product.businessOwnerJid || ''}
        onChange={(e) => update({ businessOwnerJid: e.target.value })}
      />
      <input
        className="input-base"
        placeholder="Product title"
        value={product.title || ''}
        onChange={(e) => update({ title: e.target.value })}
      />
      <textarea
        className="input-base min-h-20"
        placeholder="Product description"
        value={product.description || ''}
        onChange={(e) => update({ description: e.target.value })}
      />
      <textarea
        className="input-base min-h-20"
        placeholder="Message body shown above the product"
        value={product.body || ''}
        onChange={(e) => update({ body: e.target.value })}
      />
      <input
        className="input-base"
        placeholder="Footer (optional)"
        value={product.footer || ''}
        onChange={(e) => update({ footer: e.target.value })}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="input-base"
          placeholder="Currency code"
          value={product.currencyCode || ''}
          onChange={(e) => update({ currencyCode: e.target.value })}
        />
        <input
          className="input-base"
          placeholder="Price amount x1000"
          value={product.priceAmount1000 || ''}
          onChange={(e) => update({ priceAmount1000: e.target.value })}
        />
        <input
          className="input-base"
          placeholder="Sale price x1000 (optional)"
          value={product.salePriceAmount1000 || ''}
          onChange={(e) => update({ salePriceAmount1000: e.target.value })}
        />
        <input
          className="input-base"
          placeholder="Product ID (optional)"
          value={product.productId || ''}
          onChange={(e) => update({ productId: e.target.value })}
        />
      </div>
      <input
        className="input-base"
        placeholder="Public URL (optional)"
        value={product.url || ''}
        onChange={(e) => update({ url: e.target.value })}
      />
      <input
        className="input-base"
        placeholder="Signed URL (optional)"
        value={product.signedUrl || ''}
        onChange={(e) => update({ signedUrl: e.target.value })}
      />
      <input
        className="input-base"
        placeholder="Retailer ID (optional)"
        value={product.retailerId || ''}
        onChange={(e) => update({ retailerId: e.target.value })}
      />
      <ImageSourceField
        label="Product image"
        urlValue={product.imageUrl}
        dataUrlValue={product.imageDataUrl}
        onUrlChange={(imageUrl) => update({ imageUrl })}
        onDataUrlChange={(imageDataUrl) => update({ imageDataUrl })}
      />
    </div>
  )
}
