const addDaysInput = (days, hour = 10, minute = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const SAMPLES = [
  {
    id: 'product-card',
    name: 'Product Card',
    type: 'product',
    description: 'Single WhatsApp product message with image, price, SKU, and URL.',
    payload: {
      name: 'Sample product card',
      sendMode: 'product',
      product: {
        businessOwnerJid: '1234567890@s.whatsapp.net',
        title: 'Premium Starter Kit',
        description: 'A ready-to-test product message for WhatsApp commerce.',
        body: 'Here is the product you asked for.',
        footer: 'Reply if you need help choosing.',
        currencyCode: 'INR',
        priceAmount1000: '1499000',
        salePriceAmount1000: '',
        productId: 'starter-kit',
        url: 'https://example.com/products/starter-kit',
        signedUrl: '',
        retailerId: 'SKU-STARTER-001',
        imageUrl: 'https://picsum.photos/seed/growto-product/640/480',
        imageDataUrl: '',
      },
    },
  },
  {
    id: 'carousel',
    name: 'Product Carousel',
    type: 'carousel',
    description: 'Three-card carousel with URL and quick-reply actions.',
    payload: {
      name: 'Sample product carousel',
      sendMode: 'carousel',
      text: 'Choose a product to continue.',
      footer: 'Limited stock available',
      carousel: {
        cards: [
          {
            caption: 'Starter Kit - INR 1499',
            footer: 'Best for new customers',
            imageUrl: 'https://picsum.photos/seed/growto-carousel-1/640/480',
            imageDataUrl: '',
            buttons: [
              { type: 'cta_url', label: 'View', url: 'https://example.com/products/starter-kit' },
              { type: 'quick_reply', label: 'Order', id: 'order_starter' },
            ],
          },
          {
            caption: 'Growth Kit - INR 2499',
            footer: 'Popular choice',
            imageUrl: 'https://picsum.photos/seed/growto-carousel-2/640/480',
            imageDataUrl: '',
            buttons: [
              { type: 'cta_url', label: 'View', url: 'https://example.com/products/growth-kit' },
              { type: 'quick_reply', label: 'Order', id: 'order_growth' },
            ],
          },
          {
            caption: 'Pro Kit - INR 4999',
            footer: 'For teams',
            imageUrl: 'https://picsum.photos/seed/growto-carousel-3/640/480',
            imageDataUrl: '',
            buttons: [
              { type: 'cta_url', label: 'View', url: 'https://example.com/products/pro-kit' },
              { type: 'quick_reply', label: 'Order', id: 'order_pro' },
            ],
          },
        ],
      },
    },
  },
  {
    id: 'action-buttons',
    name: 'Buttons With Actions',
    type: 'buttons',
    description: 'Mixed quick reply, URL, copy-code, and call buttons.',
    payload: {
      name: 'Sample action buttons',
      sendMode: 'buttons',
      title: 'Need help?',
      text: 'Choose one of these actions.',
      footer: 'Our team usually replies quickly.',
      buttons: [
        { type: 'quick_reply', label: 'Talk to sales', id: 'talk_sales' },
        { type: 'cta_url', label: 'Open pricing', url: 'https://example.com/pricing' },
        { type: 'cta_copy', label: 'Copy code', copyCode: 'SAVE20' },
        { type: 'cta_call', label: 'Call us', phoneNumber: '+911234567890' },
      ],
    },
  },
  {
    id: 'url-button',
    name: 'URL Button',
    type: 'buttons',
    description: 'Simple CTA URL button for landing pages and payment links.',
    payload: {
      name: 'Sample URL button',
      sendMode: 'buttons',
      text: 'Open your checkout link below.',
      footer: 'Secure checkout',
      buttons: [{ type: 'cta_url', label: 'Open checkout', url: 'https://example.com/checkout' }],
    },
  },
  {
    id: 'multi-choice-list',
    name: 'List With Choices',
    type: 'list',
    description: 'Multi-section list with service and support choices.',
    payload: {
      name: 'Sample multi-choice list',
      sendMode: 'list',
      text: 'Pick what you need help with.',
      footer: 'Select one option',
      list: {
        title: 'Support menu',
        buttonText: 'Choose option',
        sections: [
          {
            title: 'Sales',
            rows: [
              { title: 'Product pricing', description: 'Get pricing and plan details', rowId: 'pricing' },
              { title: 'Book a demo', description: 'Schedule a walkthrough', rowId: 'demo' },
            ],
          },
          {
            title: 'Support',
            rows: [
              { title: 'Order status', description: 'Track an existing order', rowId: 'order_status' },
              { title: 'Talk to agent', description: 'Request human support', rowId: 'agent' },
            ],
          },
        ],
      },
    },
  },
  {
    id: 'event',
    name: 'Event Template',
    type: 'event',
    description: 'WhatsApp event invite with a dynamic future date.',
    payload: {
      name: 'Sample event invite',
      sendMode: 'event',
      event: {
        name: 'Product Demo',
        description: 'Join us for a live walkthrough and Q&A.',
        startDate: addDaysInput(7, 11, 0),
        endDate: addDaysInput(7, 12, 0),
        callType: 'video',
        locationName: '',
        locationAddress: '',
        latitude: '',
        longitude: '',
        extraGuestsAllowed: true,
        isCancelled: false,
        isScheduleCall: false,
      },
    },
  },
  {
    id: 'normal-buttons',
    name: 'Normal Buttons',
    type: 'buttons',
    description: 'Three plain quick-reply buttons for basic automation tests.',
    payload: {
      name: 'Sample normal buttons',
      sendMode: 'buttons',
      text: 'How can we help you today?',
      footer: '',
      buttons: [
        { type: 'quick_reply', label: 'Pricing', id: 'pricing' },
        { type: 'quick_reply', label: 'Demo', id: 'demo' },
        { type: 'quick_reply', label: 'Support', id: 'support' },
      ],
    },
  },
  {
    id: 'hydrated-template',
    name: 'Hydrated Template',
    type: 'template',
    description: 'Image header with quick-reply and URL hydrated template buttons.',
    payload: {
      name: 'Sample hydrated template',
      sendMode: 'template',
      template: {
        title: 'Welcome to Growto',
        text: 'Hi {{name}}, your onboarding kit is ready.',
        footer: 'Tap a button to continue',
        imageUrl: 'https://picsum.photos/seed/growto-template/640/480',
        imageDataUrl: '',
        buttons: [
          { type: 'quick_reply', label: 'Start setup', id: 'start_setup' },
          { type: 'cta_url', label: 'View guide', url: 'https://example.com/guide' },
        ],
      },
    },
  },
]

const clone = (value) => JSON.parse(JSON.stringify(value))

export const sampleTemplateList = () =>
  SAMPLES.map((sample) => ({
    id: sample.id,
    name: sample.name,
    type: sample.type,
    description: sample.description,
    payload: clone(sample.payload),
  }))
