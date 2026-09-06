/*
 * Todo el copy de la landing — español (default) e inglés.
 *
 * Tono del español: argentino, de persona, amigable. Le hablás a un
 * comerciante como le hablarías en el mostrador: sin jerga técnica, sin
 * frases de folleto, sin chistes. Vender tranquilidad, no asustar.
 */

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'es';

export const ui = {
  es: {
    'meta.title': 'Abasto — el sistema que le preguntás a tu negocio y te responde',
    'meta.description':
      'Compras, stock, caja, precios y clientes en una sola pantalla que se entiende de una. Y cuando algo no cierra, se lo preguntás al sistema. Para comercios de Argentina, del kiosco al mayorista.',

    'nav.skip': 'Saltar al contenido',
    'nav.escritorio': 'El escritorio',
    'nav.preguntar': 'Preguntar',
    'nav.crece': 'Crece con vos',
    'nav.idea': 'La idea',
    'nav.cta': 'Hablemos',
    'nav.theme': 'Cambiar tema',
    'nav.lang': 'Cambiar idioma',

    'hero.kicker': 'Software de gestión para comercios',
    'hero.title': 'Preguntale a tu negocio. Y te responde.',
    'hero.lead':
      'Abasto junta compras, stock, caja, precios y clientes en una sola pantalla que se entiende de una. ¿Algo no cierra? Se lo preguntás al sistema y te contesta con tus propios números.',
    'hero.cta': 'Contame de tu negocio',
    'hero.secondary': 'Ver cómo funciona',
    'hero.note': 'Del kiosco de barrio al mayorista con varias sucursales, el mismo sistema.',
    'hero.caption': 'Ctrl K desde cualquier pantalla. Le preguntás con tus palabras y te contesta con tus números.',

    'problema.kicker': 'El día a día',
    'problema.title': 'Seguro que alguna de estas te suena',
    'problema.lead':
      'No es que falte un programa. Es que cada cosa está en un lado distinto y de los problemas te enterás tarde, cuando ya no podés hacer mucho.',
    'problema.c1.data': 'La caja',
    'problema.c1.label': 'Cierra con diferencia y no hay manera de saber en qué turno ni en qué caja se fue.',
    'problema.c2.data': 'El stock',
    'problema.c2.label': 'El sistema dice que tenés 12 y en la góndola hay 3. Le vendiste a alguien algo que no estaba.',
    'problema.c3.data': 'Los precios',
    'problema.c3.label': 'Te llegó la lista nueva hace tres semanas y todavía estás vendiendo al costo viejo.',
    'problema.c4.data': 'El fiado',
    'problema.c4.label': 'El cliente te debe. ¿Cuánto? ¿Desde cuándo? Está anotado en un cuaderno.',

    'escritorio.kicker': 'El escritorio',
    'escritorio.title': 'Todo tu negocio en una pantalla',
    'escritorio.lead':
      'Abrís Abasto y ves lo que importa: las ventas del día, la plata que hay en la caja, lo que está por vencer, lo que hay que comprar. Si algo necesita que lo mires, te lo marca. Si está todo en orden, la pantalla queda tranquila y seguís con lo tuyo.',
    'escritorio.f1.title': 'Un número por cada cosa',
    'escritorio.f1.body': 'Lo justo para saber cómo viene la mano sin tener que entrar a mirar.',
    'escritorio.f2.title': 'Te avisa cuando hay algo',
    'escritorio.f2.body': 'Un punto en la esquina y ya sabés dónde hay que meterse. Verde va bien, amarillo es aviso, rojo es problema.',
    'escritorio.f3.title': 'Cada uno ve lo suyo',
    'escritorio.f3.body': 'El cajero entra a la caja, el encargado ve todo. Vos decidís qué toca cada uno.',

    'ask.q': '¿Cómo vienen las ventas esta semana?',
    'ask.a': 'Vas +12,4 % contra la semana pasada. El sábado fue tu mejor día en dos meses. Los martes siempre aflojás — te dejé armada una promo de gaseosas para probar.',
    'ask.chart': 'Ventas · últimos 7 días',
    'ask.days': 'Lun,Mar,Mié,Jue,Vie,Sáb,Dom',

    'escritorio.ia.tag': 'IA',
    'escritorio.ia.title': 'Abasto ya te ordenó el día',
    'escritorio.ia.body': 'Juntó lo urgente y lo puso arriba de todo. Si movés el jamón cocido con una promo antes del viernes, no perdés ninguno de los 4 lotes.',
    'escritorio.ia.chart': 'Lotes que vencen, por semana',

    'preguntar.kicker': 'Preguntar · Ctrl K',
    'preguntar.title': 'Preguntale lo que quieras, con tus palabras',
    'preguntar.lead':
      'Apretás Ctrl K en cualquier pantalla y escribís como le hablarías a un empleado que se sabe el negocio de memoria. Abasto cruza tus ventas, tu stock, tus compras y tus clientes, y te contesta al toque.',
    'preguntar.tag': 'IA · sugiere, vos decidís',
    'preguntar.p1.q': '¿Qué tengo que comprar esta semana?',
    'preguntar.p1.a': '12 productos bajo el mínimo. Los urgentes: harina 000 (3 días de venta), aceite de girasol 1,5 L y yerba x 1 kg. Te armé el pedido a Distribuidora del Sur: $ 184.500.',
    'preguntar.p2.q': '¿Qué clientes me deben hace más de 30 días?',
    'preguntar.p2.a': '6 clientes, $ 214.300 en total. El más grande: Kiosco La Esquina, $ 78.000, última compra hace 12 días.',
    'preguntar.p3.q': '¿Qué producto no está rindiendo?',
    'preguntar.p3.a': 'Fideos tirabuzón La Nonna: 40 paquetes parados hace 70 días, margen 6 %. La segunda marca, al lado en la góndola, rota tres veces más.',
    'preguntar.more': 'Y también:',
    'preguntar.ex1': '¿Cómo vengo contra el mes pasado?',
    'preguntar.ex2': '¿Qué productos no rotan hace 60 días?',
    'preguntar.ex3': '¿Cuánto gasté en flete este mes?',
    'preguntar.ex4': '¿A quién le compro más barato la Coca?',
    'preguntar.foot': 'Nunca toca nada solo: te acerca la respuesta y la decisión la tomás vos.',

    'crece.kicker': 'Crece con vos',
    'crece.title': 'El mismo sistema para el kiosco y para el mayorista',
    'crece.lead':
      'Abasto está pensado para el caso más difícil —varias sucursales, cuenta corriente, balanza, vencimientos, factura A— pero arranca simple. Prendés lo que necesitás cuando lo necesitás, no antes.',
    'crece.small.title': 'Un negocio, una persona',
    'crece.small.body': 'Una sucursal, un usuario. Abrís y vendés. No hay nada que configurar para empezar.',
    'crece.big.title': 'Cuando el negocio crece',
    'crece.big.body': 'Sumás sucursales, le das permisos a cada empleado, llevás la cuenta de cada cliente y ponés precios distintos según a quién le vendés.',
    'crece.foot': 'Lo simple viene de fábrica. Lo complicado aparece el día que lo pedís.',

    'idea.kicker': 'La idea',
    'idea.title': 'Que el sistema trabaje para vos, no al revés',
    'idea.body':
      'Entrás a la mañana y Abasto ya te tiene listo lo que importa: cuánto vendiste ayer, qué conviene reponer y a qué proveedor, qué clientes te deben, dónde estás ganando y dónde no. Le preguntás en tus palabras —«¿qué compro esta semana?»— y te contesta con lo que hay en el sistema. Vos decidís; él te acerca la información.',
    'idea.close': 'Esa es la Abasto que estamos construyendo: el lugar donde vive todo tu negocio, y que además te da una mano para que vaya mejor.',
    'idea.p1.t': 'Todo en un lugar',
    'idea.p1.b': 'Compras, stock, caja, precios, clientes y reportes hablando entre sí. Cargás el dato una vez y aparece donde lo necesitás.',
    'idea.p2.t': 'Te avisa a tiempo',
    'idea.p2.b': 'Lo que se vence, lo que falta, la caja que no cuadra. Te enterás cuando todavía estás a tiempo de resolverlo.',
    'idea.p3.t': 'Te responde',
    'idea.p3.b': 'Le preguntás del negocio como le hablarías a un empleado y te contesta con tus números. La decisión siempre es tuya.',

    'contacto.kicker': 'Hablemos',
    'contacto.title': 'Contame de tu negocio',
    'contacto.lead': 'Cuántas sucursales tenés, de qué es el comercio, con qué te manejás hoy. Te contesto yo, sin formularios eternos.',
    'contacto.email': 'Tu email',
    'contacto.rubro': 'Rubro',
    'contacto.rubro.ph': 'Mayorista, almacén, distribuidora…',
    'contacto.sucursales': 'Sucursales',
    'contacto.mensaje': 'Mensaje (opcional)',
    'contacto.mensaje.ph': 'Contame qué te gustaría resolver',
    'contacto.send': 'Enviar',
    'contacto.sending': 'Enviando…',
    'contacto.ok': '¡Listo! Te escribo en breve.',
    'contacto.err': 'Se ve que algo falló. Escribime directo a ',
    'contacto.privacy': 'Lo uso solo para escribirte sobre Abasto. Nada más.',

    'footer.tagline': 'El sistema para comercios que compran, stockean y venden en el mostrador. Hecho en Argentina.',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.docs': 'Documentación',
    'footer.contact': 'Contacto',
  },

  en: {
    'meta.title': 'Abasto — ask your business, and it answers',
    'meta.description':
      'Purchasing, stock, register, prices and customers on a single screen you read at a glance. And when something does not add up, you ask the system. Built for Argentine retail, from the kiosk to the wholesaler.',

    'nav.skip': 'Skip to content',
    'nav.escritorio': 'The desk',
    'nav.preguntar': 'Ask it',
    'nav.crece': 'Grows with you',
    'nav.idea': 'The idea',
    'nav.cta': "Let's talk",
    'nav.theme': 'Toggle theme',
    'nav.lang': 'Change language',

    'hero.kicker': 'Management software for retail',
    'hero.title': 'Ask your business. It answers.',
    'hero.lead':
      'Abasto brings purchasing, stock, register, prices and customers onto one screen you read at a glance. Something not adding up? You ask the system and it answers with your own numbers.',
    'hero.cta': 'Tell me about your business',
    'hero.secondary': 'See how it works',
    'hero.note': 'From the corner kiosk to the wholesaler with several branches — the same system.',
    'hero.caption': 'Ctrl K from any screen. You ask in your words and it answers with your numbers.',

    'problema.kicker': 'The day to day',
    'problema.title': "One of these probably sounds familiar",
    'problema.lead':
      "It's not that software is missing. It's that everything lives somewhere different, and you find out about the problems late, once there's little you can do.",
    'problema.c1.data': 'The till',
    'problema.c1.label': "Closes short and there's no way to tell which shift or which register it went missing in.",
    'problema.c2.data': 'The stock',
    'problema.c2.label': 'The system says you have 12 and the shelf has 3. You sold someone something that was never there.',
    'problema.c3.data': 'The prices',
    'problema.c3.label': 'The new price list came in three weeks ago and you are still selling at the old cost.',
    'problema.c4.data': 'Store credit',
    'problema.c4.label': 'The customer owes you. How much? Since when? It is written in a notebook.',

    'escritorio.kicker': 'The desk',
    'escritorio.title': 'Your whole business on one screen',
    'escritorio.lead':
      "You open Abasto and you see what matters: today's sales, the cash in the till, what's about to expire, what needs restocking. If something needs your attention, it flags it. If everything is in order, the screen stays quiet and you carry on.",
    'escritorio.f1.title': 'One number for each thing',
    'escritorio.f1.body': 'Just enough to know how things are going without having to go in and check.',
    'escritorio.f2.title': 'It tells you when something is up',
    'escritorio.f2.body': 'A dot in the corner and you know where to look. Green is fine, amber is a heads-up, red is a problem.',
    'escritorio.f3.title': 'Everyone sees their own part',
    'escritorio.f3.body': 'The cashier goes to the register, the manager sees everything. You decide what each person can touch.',

    'ask.q': 'How are sales going this week?',
    'ask.a': "You're up 12.4% on last week. Saturday was your best day in two months. Tuesdays always dip — I've drafted a soft-drinks promo for you to try.",
    'ask.chart': 'Sales · last 7 days',
    'ask.days': 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',

    'escritorio.ia.tag': 'AI',
    'escritorio.ia.title': 'Abasto already sorted your day',
    'escritorio.ia.body': 'It gathered what is urgent and put it on top. Move the cooked ham with a promo before Friday and you lose none of the 4 lots.',
    'escritorio.ia.chart': 'Lots expiring, by week',

    'preguntar.kicker': 'Ask · Ctrl K',
    'preguntar.title': 'Ask it anything, in your own words',
    'preguntar.lead':
      'Hit Ctrl K on any screen and type the way you would ask an employee who knows the business by heart. Abasto cross-checks your sales, stock, purchasing and customers and answers on the spot.',
    'preguntar.tag': 'AI · it suggests, you decide',
    'preguntar.p1.q': 'What should I buy this week?',
    'preguntar.p1.a': '12 products below minimum. The urgent ones: 000 flour (3 days of stock), 1.5 L sunflower oil and 1 kg yerba. I drafted the order to Distribuidora del Sur: $184,500.',
    'preguntar.p2.q': 'Which customers have owed me for more than 30 days?',
    'preguntar.p2.a': '6 customers, $214,300 in total. The biggest: Kiosco La Esquina, $78,000, last purchase 12 days ago.',
    'preguntar.p3.q': 'Which product is not pulling its weight?',
    'preguntar.p3.a': 'La Nonna fusilli: 40 packs sitting for 70 days, 6% margin. The second brand, right next to it on the shelf, turns over three times as fast.',
    'preguntar.more': 'And also:',
    'preguntar.ex1': 'How am I doing versus last month?',
    'preguntar.ex2': "Which products haven't moved in 60 days?",
    'preguntar.ex3': 'How much did I spend on freight this month?',
    'preguntar.ex4': 'Who sells me Coke the cheapest?',
    'preguntar.foot': 'It never acts on its own: it brings you the answer, you make the call.',

    'crece.kicker': 'Grows with you',
    'crece.title': 'The same system for the kiosk and the wholesaler',
    'crece.lead':
      'Abasto is built for the hardest case — several branches, store credit, scales, expiry dates, tax invoicing — but it starts simple. You switch on what you need when you need it, not before.',
    'crece.small.title': 'One shop, one person',
    'crece.small.body': 'One branch, one user. You open and you sell. Nothing to configure to get going.',
    'crece.big.title': 'When the business grows',
    'crece.big.body': 'You add branches, give each employee their permissions, track every customer’s account and set different prices depending on who you sell to.',
    'crece.foot': 'Simple comes as standard. The complicated part shows up the day you ask for it.',

    'idea.kicker': 'The idea',
    'idea.title': 'The system should work for you, not the other way around',
    'idea.body':
      'First thing in the morning, Abasto already has what matters ready: how much you sold yesterday, what to reorder and from which supplier, which customers owe you, where you are making money and where you are not. You ask in your own words — "what should I buy this week?" — and it answers with what is in the system. You decide; it brings you the information.',
    'idea.close': 'That is the Abasto we are building: the place where your whole business lives, and that also lends a hand to make it run better.',
    'idea.p1.t': 'Everything in one place',
    'idea.p1.b': 'Purchasing, stock, register, prices, customers and reports talking to each other. You enter something once and it shows up where you need it.',
    'idea.p2.t': 'It warns you in time',
    'idea.p2.b': 'What is expiring, what is running out, the till that does not add up. You find out while you can still fix it.',
    'idea.p3.t': 'It answers you',
    'idea.p3.b': 'You ask about the business the way you would ask an employee, and it answers with your numbers. The call is always yours.',

    'contacto.kicker': "Let's talk",
    'contacto.title': 'Tell me about your business',
    'contacto.lead': 'How many branches you have, what the shop sells, what you use today. I answer myself, no endless forms.',
    'contacto.email': 'Your email',
    'contacto.rubro': 'Trade',
    'contacto.rubro.ph': 'Wholesaler, grocery, distributor…',
    'contacto.sucursales': 'Branches',
    'contacto.mensaje': 'Message (optional)',
    'contacto.mensaje.ph': 'Tell me what you would like to solve',
    'contacto.send': 'Send',
    'contacto.sending': 'Sending…',
    'contacto.ok': "Done! I'll be in touch shortly.",
    'contacto.err': 'Looks like something failed. Write me directly at ',
    'contacto.privacy': 'I only use it to write to you about Abasto. Nothing else.',

    'footer.tagline': 'The system for shops that buy, stock and sell over the counter. Made in Argentina.',
    'footer.rights': 'All rights reserved.',
    'footer.docs': 'Documentation',
    'footer.contact': 'Contact',
  },
} as const;

export type UIKey = keyof (typeof ui)['es'];
