from rest_framework import serializers
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ContentEntry, ContentImage


class ContentImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ContentImage
        fields = ('id', 'url', 'caption')

    def get_url(self, obj):
        return '/uploads/' + obj.image.name.removeprefix('public/')


class ContentSerializer(serializers.ModelSerializer):
    image = serializers.CharField(source='image_url', read_only=True)
    images = ContentImageSerializer(many=True, read_only=True)

    class Meta:
        model = ContentEntry
        fields = ('id', 'kind', 'title', 'slug', 'summary', 'body', 'image',
                  'event_date', 'images', 'seo_title', 'seo_description', 'published_at')


class ContentListView(ListAPIView):
    serializer_class = ContentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = ContentEntry.objects.filter(status='published').prefetch_related('images')
        kind = self.request.query_params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        if self.request.query_params.get('home') == '1':
            qs = qs.filter(show_on_home=True)
        return qs


class ContentDetailView(RetrieveAPIView):
    serializer_class = ContentSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    queryset = ContentEntry.objects.filter(status='published').prefetch_related('images')


class PageSEOSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import PageSEO
        model = PageSEO
        fields = ('path', 'title', 'description', 'seo_title', 'seo_description', 'canonical_url', 'indexable')


class PageSEOView(RetrieveAPIView):
    from .models import PageSEO
    permission_classes = [AllowAny]
    serializer_class = PageSEOSerializer
    queryset = PageSEO.objects.all()

    def get_object(self):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(self.get_queryset(), path='/' if self.kwargs['path'] == 'home' else '/' + self.kwargs['path'].lstrip('/'))


class SitePageView(APIView):
    """Published content only. Never leaks draft fields or private admin preview."""
    permission_classes = [AllowAny]
    throttle_classes = []  # Public readonly CMS reads come from the shared Next.js server IP.

    def get(self, request, key):
        from django.shortcuts import get_object_or_404
        from .models import SitePage
        page = get_object_or_404(SitePage, key=key, is_active=True)
        sections = []
        for section in page.sections.filter(is_published=True).order_by('sort_order', 'id'):
            snapshot = section.published_snapshot
            if not isinstance(snapshot, dict):
                continue
            # Do not disclose IDs of unpublished products to anonymous visitors.
            from catalog.models import Product
            snapshot = dict(snapshot)
            chosen = snapshot.get('product_ids') or []
            if chosen:
                snapshot['product_ids'] = list(Product.objects.filter(
                    pk__in=chosen, status=Product.Status.PUBLISHED
                ).values_list('pk', flat=True))
            sections.append(snapshot)
        response = Response({'page': page.key, 'title': page.name, 'sections': sections})
        response['Cache-Control'] = 'public, max-age=0, must-revalidate'
        return response
