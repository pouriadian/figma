from django.db.models import Q
from rest_framework import serializers
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from .models import Product, ProductImage, ProductCategory


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ('id', 'name', 'slug')


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ('id', 'url', 'caption')

    def get_url(self, obj):
        return '/uploads/' + obj.image.name.removeprefix('public/')


class ProductSerializer(serializers.ModelSerializer):
    image = serializers.CharField(source='image_url', read_only=True)
    catalog_url = serializers.CharField(read_only=True)
    code = serializers.CharField(source='sku', read_only=True)
    href = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'slug', 'href', 'name', 'model', 'code', 'dimensions', 'image',
            'description', 'technical_specs', 'catalog_url', 'category_name', 'category_slug', 'images',
            'featured', 'seo_title', 'seo_description', 'canonical_url', 'published_at',
        )

    def get_href(self, obj):
        return '/products/' + obj.slug


class CategoryListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    queryset = ProductCategory.objects.all()
    pagination_class = None


class ProductListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.filter(status=Product.Status.PUBLISHED).select_related('category').prefetch_related('images')
        term = self.request.query_params.get('search', '').strip()[:80]
        if term:
            qs = qs.filter(Q(name__icontains=term) | Q(sku__icontains=term) | Q(model__icontains=term))
        cat = self.request.query_params.get('category', '').strip()
        if cat:
            qs = qs.filter(category__slug=cat)
        if self.request.query_params.get('featured') == '1':
            qs = qs.filter(featured=True)
        return qs


class ProductDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    lookup_field = 'slug'
    queryset = Product.objects.filter(status=Product.Status.PUBLISHED).select_related('category').prefetch_related('images')

    # Reading a public product API must be side-effect-free. The client records
    # a single accepted product_view event; frontend metrics read those events.
    # This also prevents generateMetadata + page rendering from double-counting.
