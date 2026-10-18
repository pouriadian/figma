from django.db.models import Subquery
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from accounts.models import Representative
from .models import RepresentativeProfile


class PublicRepresentativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Representative
        fields = ('id', 'company_name', 'province', 'city')


class PublicRepresentativeList(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicRepresentativeSerializer
    queryset = Representative.objects.none()

    def get_queryset(self):
        approved = RepresentativeProfile.objects.filter(is_public=True).values('representative_id')
        qs = Representative.objects.filter(status=Representative.Status.ACTIVE, pk__in=Subquery(approved))
        province = (self.request.query_params.get('province') or '').strip()[:80]
        city = (self.request.query_params.get('city') or '').strip()[:80]
        if province: qs = qs.filter(province__iexact=province)
        if city: qs = qs.filter(city__iexact=city)
        return qs.order_by('province', 'city', 'company_name', 'pk')
