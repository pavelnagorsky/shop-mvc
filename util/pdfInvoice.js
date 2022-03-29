const PDFdocument = require('pdfkit');
const Fs = require('fs');

// создание и отправка pdf отчета
module.exports = (invoicePath, res, order) => {
  const PdfDoc = new PDFdocument();
  // настройка потоков записи в файл и отправки на рендер
  PdfDoc.pipe(Fs.createWriteStream(invoicePath));
  PdfDoc.pipe(res);

  // генерация пдф отчета
  PdfDoc.fontSize(26)
    .text("Invoice", {
      underline: true
    });
  // создание читаемого представления текущего времени
  let date = new Date().toISOString()
    .replace(/\T.+/, '');  // delete the T and everything after   
  PdfDoc
    .fontSize(12)
    .text(`For User: ${order.user.email}`)
    .text(`Order ID: ${order._id}`)
    .text(`Order date: ${date}`)
  PdfDoc.text('-----------------------');
  PdfDoc
    .fontSize(16)
    .text("Order Summory:");
  let totalPrice = 0;
  order.products.forEach(prod => {
    totalPrice += prod.quantity * prod.product.price;
    PdfDoc
      .fontSize(14)
      .text(
        '   · ' +
        prod.product.title +
        ' - ' +
        prod.quantity +
        ' x ' +
        '$' +
        prod.product.price
      );
  });
  PdfDoc.text('-----------------------');
  PdfDoc.fontSize(17).text('Total Price: $' + totalPrice);

  PdfDoc.end();
}