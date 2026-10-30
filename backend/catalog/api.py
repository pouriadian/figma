from django.db.models import Count, Q
from rest_framework import serializers
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Product, ProductImage, ProductCategory, Texture


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
    textures = serializers.SerializerMethodField()
    view_count = serializers.IntegerField(source='recorded_views', read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'slug', 'href', 'name', 'model', 'code', 'dimensions', 'image',
            'description', 'technical_specs', 'catalog_url', 'category_name', 'category_slug', 'images',
            'featured', 'seo_title', 'seo_description', 'canonical_url', 'published_at', 'textures', 'view_count',
        )

    def get_textures(self, obj):
        return TextureSerializer(obj.textures.filter(is_published=True).exclude(image=''), many=True, context=self.context).data

    def get_href(self, obj):
        return '/products/' + obj.slug


class TextureSerializer(serializers.ModelSerializer):
    image = serializers.CharField(source='image_url', read_only=True)
    products_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Texture
        fields = ['id','name','slug','code','category','description','technical_specs','image','products_count','seo_title','seo_description','canonical_url']


class TextureListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = TextureSerializer
    pagination_class = None
    def get_queryset(self):
        queryset = Texture.objects.filter(is_published=True).exclude(image='').annotate(products_count=Count('products', filter=Q(products__status=Product.Status.PUBLISHED), distinct=True))
        term = self.request.query_params.get('search','').strip()[:80].translate(str.maketrans({'ي':'ی','ى':'ی','ك':'ک'}))
        if term:
            queryset = queryset.filter(Q(name__icontains=term)|Q(code__icontains=term))
        category = self.request.query_params.get('category','').strip()
        if category:
            queryset = queryset.filter(category__iexact=category)
        return queryset


class TextureDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = TextureSerializer
    lookup_field = 'slug'
    queryset = Texture.objects.filter(is_published=True).exclude(image='').annotate(products_count=Count('products', filter=Q(products__status=Product.Status.PUBLISHED), distinct=True)).prefetch_related('products')
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        data = self.get_serializer(instance).data
        data['products'] = ProductSerializer(instance.products.filter(status=Product.Status.PUBLISHED).select_related('category').prefetch_related('images'), many=True, context=self.get_serializer_context()).data
        return Response(data)

class CategoryListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    queryset = ProductCategory.objects.all()
    pagination_class = None


class ProductListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.filter(status=Product.Status.PUBLISHED).select_related('category').prefetch_related('images').annotate(recorded_views=Count('trafficevent', filter=Q(trafficevent__kind='product_view')))
        digit_map = {char: str(index) for index, char in enumerate('۰۱۲۳۴۵۶۷۸۹')}
        digit_map.update({char: str(index) for index, char in enumerate('٠١٢٣٤٥٦٧٨٩')})
        digit_map.update({'ي':'ی','ى':'ی','ك':'ک'})
        term = self.request.query_params.get('search', '').strip()[:80].translate(str.maketrans(digit_map))
        if term:
            qs = qs.filter(Q(name__icontains=term) | Q(sku__icontains=term) | Q(model__icontains=term) | Q(textures__name__icontains=term) | Q(textures__code__icontains=term)).distinct()
        cat = self.request.query_params.get('category', '').strip()
        if cat:
            qs = qs.filter(category__slug=cat)
        if self.request.query_params.get('featured') == '1':
            qs = qs.filter(featured=True)
        if self.request.query_params.get('ordering') == '-view_count':
            qs = qs.order_by('-recorded_views', 'name')
        return qs


class ProductDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    lookup_field = 'slug'
    queryset = Product.objects.filter(status=Product.Status.PUBLISHED).select_related('category').prefetch_related('images')

    # Reading a public product API must be side-effect-free. The client records
    # a single accepted product_view event; frontend metrics read those events.
    # This also prevents generateMetadata + page rendering from double-counting.
