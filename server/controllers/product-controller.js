import * as productService from '../services/product-service.js';

export async function list(req, res) {
  res.status(200).json(await productService.listProducts(req.validated.query, req.user?.id));
}

export async function best(req, res) {
  res.status(200).json(await productService.listBestProducts(
    req.validated.query.limit,
    req.user?.id,
  ));
}

export async function get(req, res) {
  res.status(200).json(await productService.getProduct(
    req.validated.params.productId,
    req.user?.id,
  ));
}

export async function create(req, res) {
  const product = await productService.createProduct(req.validated.body, req.user.id);
  res.status(201).json(product);
}

export async function update(req, res) {
  res.status(200).json(await productService.updateProduct(
    req.validated.params.productId,
    req.validated.body,
    req.user.id,
  ));
}

export async function remove(req, res) {
  await productService.deleteProduct(req.validated.params.productId, req.user.id);
  res.status(204).send();
}

export async function like(req, res) {
  res.status(200).json(await productService.likeProduct(
    req.validated.params.productId,
    req.user.id,
  ));
}

export async function unlike(req, res) {
  res.status(200).json(await productService.unlikeProduct(
    req.validated.params.productId,
    req.user.id,
  ));
}
